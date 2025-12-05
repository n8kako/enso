/**
 * Insights Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/database';
import { authenticate } from './auth';
import { createMaslowAnalyzer } from '@enso/bayesian';

export async function insightsRoutes(server: FastifyInstance) {
  // All routes require authentication
  server.addHook('preHandler', authenticate);

  /**
   * GET /insights/dashboard - Get dashboard insights
   */
  server.get('/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    // Get recent data
    const [
      recentEntries,
      activeCommitments,
      maslowProfile,
    ] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          mood: true,
          energy: true,
          createdAt: true,
          tags: true,
        },
      }),
      prisma.commitment.findMany({
        where: { userId, status: 'ACTIVE' },
        include: {
          checkIns: {
            where: {
              timestamp: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      }),
      prisma.maslowProfile.findUnique({
        where: { userId },
        include: {
          history: {
            take: 30,
            orderBy: { timestamp: 'desc' },
          },
        },
      }),
    ]);

    // Calculate mood trend
    const last7Days = recentEntries.filter(
      (e) => e.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    const previous7Days = recentEntries.filter(
      (e) =>
        e.createdAt >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
        e.createdAt < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const currentAvgMood =
      last7Days.length > 0
        ? last7Days.reduce((sum, e) => sum + e.mood, 0) / last7Days.length
        : 0;
    const previousAvgMood =
      previous7Days.length > 0
        ? previous7Days.reduce((sum, e) => sum + e.mood, 0) / previous7Days.length
        : 0;

    const moodTrend = previousAvgMood > 0
      ? ((currentAvgMood - previousAvgMood) / previousAvgMood) * 100
      : 0;

    // Calculate commitment success rate
    let totalCheckIns = 0;
    let completedCheckIns = 0;
    for (const commitment of activeCommitments) {
      totalCheckIns += commitment.checkIns.length;
      completedCheckIns += commitment.checkIns.filter((ci) => ci.completed).length;
    }
    const weeklySuccessRate = totalCheckIns > 0 ? completedCheckIns / totalCheckIns : 0;

    // Get mood by day of week
    const moodByDay: Record<number, { sum: number; count: number }> = {};
    for (const entry of recentEntries) {
      const day = entry.createdAt.getDay();
      if (!moodByDay[day]) {
        moodByDay[day] = { sum: 0, count: 0 };
      }
      moodByDay[day].sum += entry.mood;
      moodByDay[day].count++;
    }

    const moodByDayOfWeek = Object.entries(moodByDay).map(([day, data]) => ({
      day: parseInt(day),
      avgMood: data.sum / data.count,
    }));

    // Get top tags
    const tagCounts = new Map<string, number>();
    for (const entry of recentEntries) {
      for (const tag of entry.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    // Maslow trends
    const maslowTrends: Record<string, { current: number; change: number }> = {};
    if (maslowProfile) {
      const levels = [
        'physiological',
        'safety',
        'loveBelonging',
        'esteem',
        'selfActualization',
      ] as const;

      const oldestSnapshot = maslowProfile.history[maslowProfile.history.length - 1];

      for (const level of levels) {
        const current = maslowProfile[level];
        const previous = oldestSnapshot ? (oldestSnapshot as any)[level] : current;
        maslowTrends[level] = {
          current,
          change: current - previous,
        };
      }
    }

    return {
      insights: {
        moodTrend: {
          currentAverage: Math.round(currentAvgMood * 10) / 10,
          percentChange: Math.round(moodTrend * 10) / 10,
          direction: moodTrend > 0 ? 'up' : moodTrend < 0 ? 'down' : 'stable',
        },
        weeklySuccessRate: Math.round(weeklySuccessRate * 100),
        moodByDayOfWeek,
        topTags,
        maslowTrends,
        entryCount: recentEntries.length,
        activeCommitmentCount: activeCommitments.length,
      },
    };
  });

  /**
   * GET /insights/maslow - Get Maslow hierarchy insights
   */
  server.get('/maslow', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const maslowProfile = await prisma.maslowProfile.findUnique({
      where: { userId },
      include: {
        history: {
          take: 100,
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!maslowProfile) {
      return reply.status(404).send({
        error: 'Not Found',
        message: 'Maslow profile not found',
      });
    }

    // Generate insights
    const analyzer = createMaslowAnalyzer();
    const focusAreas = analyzer.getRecommendedFocusAreas({
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
    });

    return {
      profile: {
        scores: {
          physiological: maslowProfile.physiological,
          safety: maslowProfile.safety,
          love_belonging: maslowProfile.loveBelonging,
          esteem: maslowProfile.esteem,
          self_actualization: maslowProfile.selfActualization,
        },
        lastUpdated: maslowProfile.lastUpdated,
      },
      history: maslowProfile.history.map((h) => ({
        timestamp: h.timestamp,
        scores: {
          physiological: h.physiological,
          safety: h.safety,
          love_belonging: h.loveBelonging,
          esteem: h.esteem,
          self_actualization: h.selfActualization,
        },
        trigger: h.trigger,
      })),
      recommendedFocusAreas: focusAreas,
    };
  });

  /**
   * GET /insights/patterns - Get behavioral patterns
   */
  server.get('/patterns', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).userId;

    const [entries, checkIns] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          mood: true,
          energy: true,
          createdAt: true,
          wordCount: true,
        },
      }),
      prisma.commitmentCheckIn.findMany({
        where: { commitment: { userId } },
        orderBy: { timestamp: 'desc' },
        take: 100,
        include: {
          commitment: {
            select: { category: true },
          },
        },
      }),
    ]);

    // Analyze journaling patterns
    const hourlyMood: Record<number, { sum: number; count: number }> = {};
    for (const entry of entries) {
      const hour = entry.createdAt.getHours();
      if (!hourlyMood[hour]) {
        hourlyMood[hour] = { sum: 0, count: 0 };
      }
      hourlyMood[hour].sum += entry.mood;
      hourlyMood[hour].count++;
    }

    const bestJournalingHours = Object.entries(hourlyMood)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        avgMood: data.sum / data.count,
        count: data.count,
      }))
      .filter((h) => h.count >= 3)
      .sort((a, b) => b.avgMood - a.avgMood)
      .slice(0, 3);

    // Analyze commitment patterns
    const categorySuccess: Record<string, { success: number; total: number }> = {};
    for (const checkIn of checkIns) {
      const category = checkIn.commitment.category;
      if (!categorySuccess[category]) {
        categorySuccess[category] = { success: 0, total: 0 };
      }
      categorySuccess[category].total++;
      if (checkIn.completed) {
        categorySuccess[category].success++;
      }
    }

    const categorySuccessRates = Object.entries(categorySuccess)
      .map(([category, data]) => ({
        category,
        successRate: data.success / data.total,
        total: data.total,
      }))
      .sort((a, b) => b.successRate - a.successRate);

    // Mood-energy correlation
    let moodEnergyCorrelation = 0;
    if (entries.length >= 10) {
      const avgMood = entries.reduce((s, e) => s + e.mood, 0) / entries.length;
      const avgEnergy = entries.reduce((s, e) => s + e.energy, 0) / entries.length;

      let numerator = 0;
      let denomMood = 0;
      let denomEnergy = 0;

      for (const entry of entries) {
        const moodDiff = entry.mood - avgMood;
        const energyDiff = entry.energy - avgEnergy;
        numerator += moodDiff * energyDiff;
        denomMood += moodDiff * moodDiff;
        denomEnergy += energyDiff * energyDiff;
      }

      if (denomMood > 0 && denomEnergy > 0) {
        moodEnergyCorrelation = numerator / Math.sqrt(denomMood * denomEnergy);
      }
    }

    return {
      patterns: {
        bestJournalingHours,
        categorySuccessRates,
        moodEnergyCorrelation: Math.round(moodEnergyCorrelation * 100) / 100,
        averageWordCount:
          entries.length > 0
            ? Math.round(entries.reduce((s, e) => s + e.wordCount, 0) / entries.length)
            : 0,
      },
    };
  });
}
