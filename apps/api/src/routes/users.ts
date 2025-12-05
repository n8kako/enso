/**
 * User Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/database';
import { authenticate } from './auth';

// Validation schemas
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  notificationsEnabled: z.boolean().optional(),
  dailyReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  weeklyReviewDay: z.number().min(0).max(6).optional().nullable(),
  aiPersonality: z.enum(['SUPPORTIVE', 'COACH', 'CURIOUS', 'BALANCED']).optional(),
  shareAnonymousData: z.boolean().optional(),
  allowAILearning: z.boolean().optional(),
  dataRetentionDays: z.number().min(30).max(365).optional(),
  focusAreas: z.array(z.enum([
    'PHYSIOLOGICAL',
    'SAFETY',
    'LOVE_BELONGING',
    'ESTEEM',
    'SELF_ACTUALIZATION',
  ])).optional(),
});

export async function userRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  /**
   * GET /users/profile - Get user profile
   */
  server.get('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        timezone: true,
        subscription: true,
        onboardingCompleted: true,
        createdAt: true,
        preferences: true,
        maslowProfile: {
          include: {
            history: {
              take: 30,
              orderBy: { timestamp: 'desc' },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    return { user };
  });

  /**
   * PATCH /users/profile - Update user profile
   */
  server.patch('/profile', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = updateUserSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data: body,
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        timezone: true,
        subscription: true,
        onboardingCompleted: true,
        updatedAt: true,
      },
    });

    return { user };
  });

  /**
   * PATCH /users/preferences - Update user preferences
   */
  server.patch('/preferences', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = updatePreferencesSchema.parse(request.body);

    const preferences = await prisma.userPreferences.update({
      where: { userId },
      data: body,
    });

    return { preferences };
  });

  /**
   * GET /users/stats - Get user statistics
   */
  server.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    // Get counts
    const [
      totalJournalEntries,
      totalCommitments,
      activeCommitments,
      completedCommitments,
      journalEntries,
      commitments,
      maslowProfile,
    ] = await Promise.all([
      prisma.journalEntry.count({ where: { userId } }),
      prisma.commitment.count({ where: { userId } }),
      prisma.commitment.count({ where: { userId, status: 'ACTIVE' } }),
      prisma.commitment.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.journalEntry.findMany({
        where: { userId },
        select: { mood: true, energy: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      prisma.commitment.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          checkIns: {
            orderBy: { timestamp: 'desc' },
            take: 30,
          },
        },
      }),
      prisma.maslowProfile.findUnique({
        where: { userId },
      }),
    ]);

    // Calculate averages
    const avgMood =
      journalEntries.length > 0
        ? journalEntries.reduce((sum, e) => sum + e.mood, 0) / journalEntries.length
        : 0;

    const avgEnergy =
      journalEntries.length > 0
        ? journalEntries.reduce((sum, e) => sum + e.energy, 0) / journalEntries.length
        : 0;

    // Calculate streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);

      const hasEntry = journalEntries.some((e) => {
        const entryDate = new Date(e.createdAt);
        entryDate.setHours(0, 0, 0, 0);
        return entryDate.getTime() === checkDate.getTime();
      });

      if (hasEntry) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    // (Simplified - would need full history for accurate calculation)

    return {
      stats: {
        totalJournalEntries,
        totalCommitments,
        activeCommitments,
        completedCommitments,
        currentStreak,
        longestStreak,
        averageMood: Math.round(avgMood * 10) / 10,
        averageEnergy: Math.round(avgEnergy * 10) / 10,
        maslowScores: maslowProfile
          ? {
              physiological: maslowProfile.physiological,
              safety: maslowProfile.safety,
              love_belonging: maslowProfile.loveBelonging,
              esteem: maslowProfile.esteem,
              self_actualization: maslowProfile.selfActualization,
            }
          : null,
      },
    };
  });

  /**
   * POST /users/complete-onboarding - Mark onboarding as complete
   */
  server.post('/complete-onboarding', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
      select: {
        id: true,
        onboardingCompleted: true,
      },
    });

    return { user };
  });

  /**
   * DELETE /users/account - Delete user account
   */
  server.delete('/account', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    await prisma.user.delete({
      where: { id: userId },
    });

    reply.clearCookie('token');

    return { success: true };
  });
}
