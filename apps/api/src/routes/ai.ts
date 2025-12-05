/**
 * AI Agent Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../services/database';
import { authenticate } from './auth';
import { JournalAgent, LLMProvider, createMockJournalAgent } from '@enso/ai-agent';
import { createMaslowAnalyzer } from '@enso/bayesian';

// Validation schemas
const chatSchema = z.object({
  entryId: z.string().uuid(),
  message: z.string().min(1).max(2000),
});

const analyzeSchema = z.object({
  entryId: z.string().uuid(),
});

const suggestCommitmentSchema = z.object({
  based_on_entries: z.array(z.string().uuid()).optional(),
});

// Initialize AI agent (would use real LLM in production)
const agent = createMockJournalAgent();

export async function aiRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  /**
   * POST /ai/chat - Send message to AI agent
   */
  server.post('/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = chatSchema.parse(request.body);

    // Get entry and verify ownership
    const entry = await prisma.journalEntry.findFirst({
      where: { id: body.entryId, userId },
      include: {
        aiMessages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Journal entry not found',
      });
    }

    // Get user profile and stats for context
    const [maslowProfile, stats] = await Promise.all([
      prisma.maslowProfile.findUnique({ where: { userId } }),
      getUserStats(userId),
    ]);

    // Save user message
    const userMessage = await prisma.aIMessage.create({
      data: {
        entryId: body.entryId,
        role: 'USER',
        content: body.message,
      },
    });

    // Generate AI response
    const profile = maslowProfile
      ? {
          userId,
          scores: {
            physiological: maslowProfile.physiological,
            safety: maslowProfile.safety,
            love_belonging: maslowProfile.loveBelonging,
            esteem: maslowProfile.esteem,
            self_actualization: maslowProfile.selfActualization,
          } as any,
          lastUpdated: maslowProfile.lastUpdated,
          history: [],
        }
      : {
          userId,
          scores: {
            physiological: 50,
            safety: 50,
            love_belonging: 50,
            esteem: 50,
            self_actualization: 50,
          } as any,
          lastUpdated: new Date(),
          history: [],
        };

    const aiResponse = await agent.generateFollowUp(
      entry.aiMessages.map((m) => ({
        id: m.id,
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
        timestamp: m.timestamp,
      })),
      profile
    );

    // Save AI response
    const savedResponse = await prisma.aIMessage.create({
      data: {
        entryId: body.entryId,
        role: 'ASSISTANT',
        content: aiResponse.content,
        metadata: aiResponse.metadata || undefined,
      },
    });

    return {
      userMessage: {
        id: userMessage.id,
        role: 'user',
        content: userMessage.content,
        timestamp: userMessage.timestamp,
      },
      aiResponse: {
        id: savedResponse.id,
        role: 'assistant',
        content: savedResponse.content,
        timestamp: savedResponse.timestamp,
        metadata: savedResponse.metadata,
      },
    };
  });

  /**
   * POST /ai/analyze - Analyze a journal entry
   */
  server.post('/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = analyzeSchema.parse(request.body);

    // Get entry and verify ownership
    const entry = await prisma.journalEntry.findFirst({
      where: { id: body.entryId, userId },
    });

    if (!entry) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Journal entry not found',
      });
    }

    // Analyze entry
    const analysis = await agent.analyzeEntry(entry.content);

    // Save analysis
    const savedAnalysis = await prisma.journalAnalysis.upsert({
      where: { entryId: body.entryId },
      create: {
        entryId: body.entryId,
        sentimentScore: analysis.sentimentScore,
        emotionalTones: analysis.emotions,
        maslowImpacts: {},
        extractedThemes: analysis.themes,
        suggestedCommitments: [],
        insightSummary: analysis.keyInsight,
      },
      update: {
        sentimentScore: analysis.sentimentScore,
        emotionalTones: analysis.emotions,
        extractedThemes: analysis.themes,
        insightSummary: analysis.keyInsight,
      },
    });

    // Update Maslow profile based on analysis
    if (analysis.maslowLevels.length > 0) {
      const maslowAnalyzer = createMaslowAnalyzer();
      const entryAnalysis = maslowAnalyzer.analyzeJournalEntry({
        id: entry.id,
        userId,
        type: entry.type as any,
        content: entry.content,
        mood: entry.mood,
        energy: entry.energy,
        aiConversation: [],
        tags: entry.tags,
        linkedCommitments: [],
        maslowLevelsDetected: [],
        wordCount: entry.wordCount,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });

      // Update Maslow profile scores
      const currentProfile = await prisma.maslowProfile.findUnique({
        where: { userId },
      });

      if (currentProfile) {
        const updates: Record<string, number> = {};

        for (const [level, impact] of Object.entries(entryAnalysis.levelScoreImpacts)) {
          const dbField = level === 'love_belonging' ? 'loveBelonging' : level;
          const currentScore = (currentProfile as any)[dbField] || 50;
          updates[dbField] = Math.max(0, Math.min(100, currentScore + (impact as number)));
        }

        if (Object.keys(updates).length > 0) {
          await prisma.maslowProfile.update({
            where: { userId },
            data: {
              ...updates,
              lastUpdated: new Date(),
            },
          });

          // Create snapshot
          await prisma.maslowSnapshot.create({
            data: {
              profileId: currentProfile.id,
              physiological: updates.physiological ?? currentProfile.physiological,
              safety: updates.safety ?? currentProfile.safety,
              loveBelonging: updates.loveBelonging ?? currentProfile.loveBelonging,
              esteem: updates.esteem ?? currentProfile.esteem,
              selfActualization: updates.selfActualization ?? currentProfile.selfActualization,
              trigger: 'JOURNAL_ENTRY',
            },
          });
        }
      }
    }

    return {
      analysis: {
        id: savedAnalysis.id,
        sentimentScore: savedAnalysis.sentimentScore,
        emotionalTones: savedAnalysis.emotionalTones,
        extractedThemes: savedAnalysis.extractedThemes,
        insightSummary: savedAnalysis.insightSummary,
        maslowLevelsDetected: analysis.maslowLevels,
      },
    };
  });

  /**
   * POST /ai/suggest-commitment - Get AI commitment suggestion
   */
  server.post('/suggest-commitment', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;
    const body = suggestCommitmentSchema.parse(request.body);

    // Get recent entries
    const entries = await prisma.journalEntry.findMany({
      where: {
        userId,
        ...(body.based_on_entries && { id: { in: body.based_on_entries } }),
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get existing commitments
    const commitments = await prisma.commitment.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    // Get Maslow profile
    const maslowProfile = await prisma.maslowProfile.findUnique({
      where: { userId },
    });

    const profile = maslowProfile
      ? {
          userId,
          scores: {
            physiological: maslowProfile.physiological,
            safety: maslowProfile.safety,
            love_belonging: maslowProfile.loveBelonging,
            esteem: maslowProfile.esteem,
            self_actualization: maslowProfile.selfActualization,
          } as any,
          lastUpdated: maslowProfile.lastUpdated,
          history: [],
        }
      : {
          userId,
          scores: {
            physiological: 50,
            safety: 50,
            love_belonging: 50,
            esteem: 50,
            self_actualization: 50,
          } as any,
          lastUpdated: new Date(),
          history: [],
        };

    // Generate suggestion
    const suggestion = await agent.suggestCommitment(
      entries.map((e) => ({
        id: e.id,
        userId,
        type: e.type as any,
        content: e.content,
        mood: e.mood,
        energy: e.energy,
        aiConversation: [],
        tags: e.tags,
        linkedCommitments: [],
        maslowLevelsDetected: [],
        wordCount: e.wordCount,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      commitments.map((c) => ({
        id: c.id,
        userId,
        title: c.title,
        description: c.description,
        maslowLevel: c.maslowLevel.toLowerCase() as any,
        category: c.category,
        status: c.status.toLowerCase() as any,
        frequency: c.frequency.toLowerCase() as any,
        currentCount: c.currentCount,
        successProbability: c.successProbability,
        confidenceInterval: [c.confidenceLower, c.confidenceUpper] as [number, number],
        checkIns: [],
        startDate: c.startDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      profile
    );

    return {
      suggestion: {
        content: suggestion.content,
        timestamp: suggestion.timestamp,
      },
    };
  });

  /**
   * GET /ai/daily-reflection - Get end-of-day reflection
   */
  server.get('/daily-reflection', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    // Get today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayEntries, commitments, maslowProfile, stats] = await Promise.all([
      prisma.journalEntry.findMany({
        where: {
          userId,
          createdAt: { gte: today },
        },
      }),
      prisma.commitment.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          checkIns: {
            where: { timestamp: { gte: today } },
          },
        },
      }),
      prisma.maslowProfile.findUnique({ where: { userId } }),
      getUserStats(userId),
    ]);

    const profile = maslowProfile
      ? {
          userId,
          scores: {
            physiological: maslowProfile.physiological,
            safety: maslowProfile.safety,
            love_belonging: maslowProfile.loveBelonging,
            esteem: maslowProfile.esteem,
            self_actualization: maslowProfile.selfActualization,
          } as any,
          lastUpdated: maslowProfile.lastUpdated,
          history: [],
        }
      : {
          userId,
          scores: {
            physiological: 50,
            safety: 50,
            love_belonging: 50,
            esteem: 50,
            self_actualization: 50,
          } as any,
          lastUpdated: new Date(),
          history: [],
        };

    const reflection = await agent.generateDailyReflection(
      profile,
      stats,
      todayEntries.map((e) => ({
        id: e.id,
        userId,
        type: e.type as any,
        content: e.content,
        mood: e.mood,
        energy: e.energy,
        aiConversation: [],
        tags: e.tags,
        linkedCommitments: [],
        maslowLevelsDetected: [],
        wordCount: e.wordCount,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      commitments.map((c) => ({
        id: c.id,
        userId,
        title: c.title,
        description: c.description,
        maslowLevel: c.maslowLevel.toLowerCase() as any,
        category: c.category,
        status: c.status.toLowerCase() as any,
        frequency: c.frequency.toLowerCase() as any,
        currentCount: c.currentCount,
        successProbability: c.successProbability,
        confidenceInterval: [c.confidenceLower, c.confidenceUpper] as [number, number],
        checkIns: c.checkIns.map((ci) => ({
          id: ci.id,
          commitmentId: ci.commitmentId,
          timestamp: ci.timestamp,
          completed: ci.completed,
        })),
        startDate: c.startDate,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      }))
    );

    return {
      reflection: {
        content: reflection.content,
        timestamp: reflection.timestamp,
        summary: {
          entriesCount: todayEntries.length,
          commitmentsCompleted: commitments.filter((c) =>
            c.checkIns.some((ci) => ci.completed)
          ).length,
          totalActiveCommitments: commitments.length,
        },
      },
    };
  });
}

// Helper function to get user stats
async function getUserStats(userId: string) {
  const [
    totalJournalEntries,
    activeCommitments,
    completedCommitments,
    recentEntries,
  ] = await Promise.all([
    prisma.journalEntry.count({ where: { userId } }),
    prisma.commitment.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.commitment.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.journalEntry.findMany({
      where: { userId },
      select: { mood: true, energy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ]);

  // Calculate streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);

    const hasEntry = recentEntries.some((e) => {
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

  const avgMood =
    recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.mood, 0) / recentEntries.length
      : 5;

  const avgEnergy =
    recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.energy, 0) / recentEntries.length
      : 5;

  return {
    userId,
    totalJournalEntries,
    totalCommitments: activeCommitments + completedCommitments,
    activeCommitments,
    completedCommitments,
    currentStreak,
    longestStreak: currentStreak, // Simplified
    averageMood: avgMood,
    averageEnergy: avgEnergy,
    maslowScores: {} as any,
    lastActiveAt: new Date(),
  };
}
