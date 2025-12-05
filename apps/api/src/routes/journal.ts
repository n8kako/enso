/**
 * Journal Entry Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/database';
import { authenticate } from './auth';

// Validation schemas
const createEntrySchema = z.object({
  type: z.enum([
    'FREE_WRITE',
    'PROMPTED',
    'REFLECTION',
    'GRATITUDE',
    'GOAL_SETTING',
    'CHECK_IN',
  ]).default('FREE_WRITE'),
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  promptId: z.string().uuid().optional(),
  mood: z.number().min(1).max(10),
  energy: z.number().min(1).max(10),
  tags: z.array(z.string()).default([]),
});

const updateEntrySchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).optional(),
  mood: z.number().min(1).max(10).optional(),
  energy: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
});

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  type: z.enum([
    'FREE_WRITE',
    'PROMPTED',
    'REFLECTION',
    'GRATITUDE',
    'GOAL_SETTING',
    'CHECK_IN',
  ]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  search: z.string().optional(),
});

export async function journalRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  /**
   * GET /journal - List journal entries
   */
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const query = querySchema.parse(request.query);

    const where: any = { userId };

    if (query.type) {
      where.type = query.type;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = query.startDate;
      }
      if (query.endDate) {
        where.createdAt.lte = query.endDate;
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { content: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          mood: true,
          energy: true,
          tags: true,
          wordCount: true,
          createdAt: true,
          updatedAt: true,
          aiMessages: {
            take: 1,
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    // Add hasAIConversation flag
    const entriesWithFlags = entries.map((entry) => ({
      ...entry,
      hasAIConversation: entry.aiMessages.length > 0,
      aiMessages: undefined,
      preview: entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : ''),
    }));

    return {
      entries: entriesWithFlags,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  });

  /**
   * GET /journal/:id - Get single journal entry
   */
  server.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    const entry = await prisma.journalEntry.findFirst({
      where: { id, userId },
      include: {
        prompt: true,
        analysis: true,
        aiMessages: {
          orderBy: { timestamp: 'asc' },
        },
        linkedCommitments: {
          include: {
            commitment: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Journal entry not found',
      });
    }

    return { entry };
  });

  /**
   * POST /journal - Create new journal entry
   */
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = createEntrySchema.parse(request.body);

    // Calculate word count
    const wordCount = body.content.trim().split(/\s+/).filter(Boolean).length;

    const entry = await prisma.journalEntry.create({
      data: {
        userId,
        ...body,
        wordCount,
      },
      include: {
        prompt: true,
      },
    });

    return { entry };
  });

  /**
   * PATCH /journal/:id - Update journal entry
   */
  server.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };
    const body = updateEntrySchema.parse(request.body);

    // Check ownership
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Journal entry not found',
      });
    }

    // Calculate word count if content updated
    const wordCount = body.content
      ? body.content.trim().split(/\s+/).filter(Boolean).length
      : undefined;

    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...body,
        ...(wordCount !== undefined && { wordCount }),
      },
    });

    return { entry };
  });

  /**
   * DELETE /journal/:id - Delete journal entry
   */
  server.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const { id } = request.params as { id: string };

    // Check ownership
    const existing = await prisma.journalEntry.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Journal entry not found',
      });
    }

    await prisma.journalEntry.delete({
      where: { id },
    });

    return { success: true };
  });

  /**
   * GET /journal/prompts - Get available journal prompts
   */
  server.get('/prompts/list', async (request: FastifyRequest, reply: FastifyReply) => {
    const prompts = await prisma.journalPrompt.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return { prompts };
  });

  /**
   * GET /journal/prompts/random - Get a random journal prompt
   */
  server.get('/prompts/random', async (request: FastifyRequest, reply: FastifyReply) => {
    const { category, maslowLevel } = request.query as {
      category?: string;
      maslowLevel?: string;
    };

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (maslowLevel) where.maslowLevel = maslowLevel;

    const count = await prisma.journalPrompt.count({ where });
    const skip = Math.floor(Math.random() * count);

    const prompt = await prisma.journalPrompt.findFirst({
      where,
      skip,
    });

    return { prompt };
  });
}
