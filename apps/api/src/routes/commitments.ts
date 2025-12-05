/**
 * Commitment Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/database';
import { authenticate } from './auth';
import { createCommitmentPredictor, createPredictionEngine } from '@enso/bayesian';

// Validation schemas
const createCommitmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  maslowLevel: z.enum([
    'PHYSIOLOGICAL',
    'SAFETY',
    'LOVE_BELONGING',
    'ESTEEM',
    'SELF_ACTUALIZATION',
  ]),
  category: z.string(),
  frequency: z.enum(['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']),
  customFrequencyDays: z.number().min(1).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  targetCount: z.number().min(1).optional(),
});

const updateCommitmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED', 'ABANDONED']).optional(),
  endDate: z.coerce.date().optional().nullable(),
  targetCount: z.number().min(1).optional().nullable(),
});

const checkInSchema = z.object({
  completed: z.boolean(),
  notes: z.string().optional(),
  mood: z.number().min(1).max(5).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  contextFactors: z.array(z.object({
    type: z.enum(['time_of_day', 'day_of_week', 'location', 'social', 'energy', 'stress', 'weather']),
    value: z.union([z.string(), z.number()]),
  })).optional(),
});

export async function commitmentRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  /**
   * GET /commitments - List user commitments
   */
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { status, maslowLevel } = request.query as {
      status?: string;
      maslowLevel?: string;
    };

    const where: any = { userId };
    if (status) where.status = status;
    if (maslowLevel) where.maslowLevel = maslowLevel;

    const commitments = await prisma.commitment.findMany({
      where,
      include: {
        checkIns: {
          orderBy: { timestamp: 'desc' },
          take: 7,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate streak for each commitment
    const commitmentsWithStreak = commitments.map((commitment) => {
      let streak = 0;
      for (const checkIn of commitment.checkIns) {
        if (checkIn.completed) streak++;
        else break;
      }

      return {
        ...commitment,
        currentStreak: streak,
      };
    });

    return { commitments: commitmentsWithStreak };
  });

  /**
   * GET /commitments/:id - Get single commitment
   */
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const commitment = await prisma.commitment.findFirst({
      where: { id, userId },
      include: {
        checkIns: {
          orderBy: { timestamp: 'desc' },
        },
        linkedEntries: {
          include: {
            entry: {
              select: {
                id: true,
                title: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!commitment) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Commitment not found',
      });
    }

    // Calculate streak
    let currentStreak = 0;
    for (const checkIn of commitment.checkIns) {
      if (checkIn.completed) currentStreak++;
      else break;
    }

    return {
      commitment: {
        ...commitment,
        currentStreak,
      },
    };
  });

  /**
   * POST /commitments - Create new commitment
   */
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = createCommitmentSchema.parse(request.body);

    // Get user history for prediction
    const allCheckIns = await prisma.commitmentCheckIn.findMany({
      where: { commitment: { userId } },
      include: { commitment: true },
    });

    // Calculate initial success probability
    const predictor = createCommitmentPredictor();
    const categoryCheckIns = allCheckIns.filter(
      (ci) => ci.commitment.category === body.category
    );

    let successProbability = 0.5;
    let confidenceLower = 0.3;
    let confidenceUpper = 0.7;

    if (categoryCheckIns.length >= 3) {
      const successRate =
        categoryCheckIns.filter((ci) => ci.completed).length / categoryCheckIns.length;
      successProbability = successRate;
      // Simple confidence interval
      const margin = 1 / Math.sqrt(categoryCheckIns.length);
      confidenceLower = Math.max(0, successRate - margin);
      confidenceUpper = Math.min(1, successRate + margin);
    }

    const commitment = await prisma.commitment.create({
      data: {
        userId,
        ...body,
        startDate: body.startDate || new Date(),
        successProbability,
        confidenceLower,
        confidenceUpper,
      },
    });

    return { commitment };
  });

  /**
   * PATCH /commitments/:id - Update commitment
   */
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = updateCommitmentSchema.parse(request.body);

    // Check ownership
    const existing = await prisma.commitment.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Commitment not found',
      });
    }

    const commitment = await prisma.commitment.update({
      where: { id },
      data: body,
    });

    return { commitment };
  });

  /**
   * DELETE /commitments/:id - Delete commitment
   */
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    // Check ownership
    const existing = await prisma.commitment.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Commitment not found',
      });
    }

    await prisma.commitment.delete({
      where: { id },
    });

    return { success: true };
  });

  /**
   * POST /commitments/:id/check-in - Record a check-in
   */
  server.post('/:id/check-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = checkInSchema.parse(request.body);

    // Check ownership and get commitment
    const commitment = await prisma.commitment.findFirst({
      where: { id, userId },
      include: {
        checkIns: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!commitment) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Commitment not found',
      });
    }

    // Create check-in
    const checkIn = await prisma.commitmentCheckIn.create({
      data: {
        commitmentId: id,
        ...body,
        contextFactors: body.contextFactors || undefined,
      },
    });

    // Update success probability using Bayesian update
    const allCheckIns = [...commitment.checkIns, checkIn];
    const successes = allCheckIns.filter((ci) => ci.completed).length;
    const total = allCheckIns.length;

    // Beta distribution posterior: (alpha + successes) / (alpha + beta + total)
    const alpha = 2; // Prior
    const beta = 2;
    const newProbability = (alpha + successes) / (alpha + beta + total);

    // Update commitment
    await prisma.commitment.update({
      where: { id },
      data: {
        currentCount: body.completed ? commitment.currentCount + 1 : commitment.currentCount,
        successProbability: newProbability,
        status:
          commitment.targetCount && commitment.currentCount + 1 >= commitment.targetCount
            ? 'COMPLETED'
            : commitment.status,
      },
    });

    return { checkIn };
  });

  /**
   * GET /commitments/:id/predict - Get success prediction
   */
  server.get('/:id/predict', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const commitment = await prisma.commitment.findFirst({
      where: { id, userId },
      include: {
        checkIns: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!commitment) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Commitment not found',
      });
    }

    // Calculate prediction
    const engine = createPredictionEngine();
    const checkIns = commitment.checkIns.map((ci) => ({
      id: ci.id,
      commitmentId: ci.commitmentId,
      timestamp: ci.timestamp,
      completed: ci.completed,
      notes: ci.notes || undefined,
      mood: ci.mood || undefined,
      difficulty: ci.difficulty || undefined,
      contextFactors: (ci.contextFactors as any) || undefined,
    }));

    const prediction = engine.simplePredict(checkIns);

    // Get optimal timing suggestion
    const timing = engine.suggestOptimalTiming(
      checkIns,
      commitment.frequency.toLowerCase() as any
    );

    return {
      prediction: {
        probability: prediction.probability,
        confidenceInterval: prediction.confidenceInterval,
        sampleSize: prediction.sampleSize,
      },
      suggestedTiming: timing,
    };
  });
}
