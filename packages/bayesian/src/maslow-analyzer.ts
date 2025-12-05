/**
 * Maslow Hierarchy Analyzer
 *
 * Analyzes user data to estimate satisfaction levels across
 * Maslow's Hierarchy of Needs.
 */

import type {
  MaslowLevel,
  MaslowProfile,
  MaslowScoreSnapshot,
  JournalEntry,
  Commitment,
  CommitmentCheckIn,
} from '@enso/core';

import { MaslowLevelOrder, getRecommendedFocusLevel, calculateWellbeingScore } from '@enso/core';

/**
 * Keywords associated with each Maslow level for text analysis
 */
const MASLOW_KEYWORDS: Record<MaslowLevel, string[]> = {
  physiological: [
    'sleep', 'tired', 'exhausted', 'hungry', 'food', 'eat', 'water', 'drink',
    'exercise', 'workout', 'gym', 'health', 'sick', 'pain', 'energy', 'rest',
    'fatigue', 'insomnia', 'diet', 'nutrition', 'hydration', 'body',
  ],
  safety: [
    'money', 'finance', 'bills', 'rent', 'mortgage', 'job', 'work', 'career',
    'savings', 'debt', 'income', 'salary', 'insurance', 'security', 'stable',
    'uncertain', 'worried', 'anxious', 'safe', 'danger', 'risk', 'housing',
  ],
  love_belonging: [
    'friend', 'family', 'partner', 'relationship', 'love', 'lonely', 'alone',
    'together', 'connection', 'community', 'belong', 'social', 'date', 'dating',
    'marriage', 'divorce', 'children', 'parent', 'sibling', 'intimacy', 'support',
  ],
  esteem: [
    'confident', 'proud', 'achievement', 'success', 'accomplish', 'respect',
    'recognition', 'worth', 'value', 'skill', 'talent', 'competent', 'promotion',
    'award', 'praise', 'criticism', 'failure', 'embarrassed', 'ashamed', 'status',
  ],
  self_actualization: [
    'purpose', 'meaning', 'fulfillment', 'potential', 'growth', 'learn', 'create',
    'creativity', 'passion', 'dream', 'goal', 'vision', 'spirituality', 'meditation',
    'mindfulness', 'wisdom', 'authentic', 'true self', 'destiny', 'legacy',
  ],
};

/**
 * Sentiment modifiers for score calculation
 */
const POSITIVE_MODIFIERS = [
  'good', 'great', 'amazing', 'wonderful', 'happy', 'excited', 'grateful',
  'thankful', 'blessed', 'love', 'enjoy', 'better', 'improving', 'progress',
];

const NEGATIVE_MODIFIERS = [
  'bad', 'terrible', 'awful', 'horrible', 'sad', 'depressed', 'anxious',
  'worried', 'stressed', 'frustrated', 'angry', 'worse', 'struggling', 'failing',
];

/**
 * Analysis result for a single journal entry
 */
export interface JournalMaslowAnalysis {
  entryId: string;
  detectedLevels: MaslowLevel[];
  levelScoreImpacts: Partial<Record<MaslowLevel, number>>;
  overallSentiment: number; // -1 to 1
  confidence: number; // 0 to 1
}

/**
 * Maslow Analyzer class
 */
export class MaslowAnalyzer {
  /**
   * Analyze a journal entry for Maslow level content
   */
  analyzeJournalEntry(entry: JournalEntry): JournalMaslowAnalysis {
    const content = entry.content.toLowerCase();
    const words = content.split(/\s+/);

    // Detect which levels are mentioned
    const levelMentions = new Map<MaslowLevel, number>();
    const levelSentiments = new Map<MaslowLevel, number[]>();

    for (const [level, keywords] of Object.entries(MASLOW_KEYWORDS)) {
      const maslowLevel = level as MaslowLevel;
      let mentions = 0;
      const sentiments: number[] = [];

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (keywords.some((kw) => word.includes(kw))) {
          mentions++;

          // Check surrounding words for sentiment
          const context = words.slice(Math.max(0, i - 3), Math.min(words.length, i + 4));
          const sentiment = this.calculateContextSentiment(context);
          sentiments.push(sentiment);
        }
      }

      if (mentions > 0) {
        levelMentions.set(maslowLevel, mentions);
        levelSentiments.set(maslowLevel, sentiments);
      }
    }

    // Calculate score impacts based on mentions and sentiment
    const levelScoreImpacts: Partial<Record<MaslowLevel, number>> = {};
    for (const [level, mentions] of levelMentions) {
      const sentiments = levelSentiments.get(level) ?? [];
      const avgSentiment = sentiments.length > 0
        ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length
        : 0;

      // Impact ranges from -10 to +10 based on mentions and sentiment
      const baseImpact = Math.min(mentions * 2, 10);
      levelScoreImpacts[level] = Math.round(baseImpact * avgSentiment);
    }

    // Calculate overall sentiment
    const overallSentiment = this.calculateOverallSentiment(content);

    // Confidence based on content length and keyword matches
    const totalMentions = Array.from(levelMentions.values()).reduce((a, b) => a + b, 0);
    const confidence = Math.min((words.length / 50) * 0.5 + (totalMentions / 10) * 0.5, 1);

    return {
      entryId: entry.id,
      detectedLevels: Array.from(levelMentions.keys()).sort(
        (a, b) => MaslowLevelOrder[a] - MaslowLevelOrder[b]
      ),
      levelScoreImpacts,
      overallSentiment,
      confidence,
    };
  }

  /**
   * Update Maslow profile based on journal analyses
   */
  updateProfile(
    currentProfile: MaslowProfile,
    analyses: JournalMaslowAnalysis[]
  ): MaslowProfile {
    const newScores = { ...currentProfile.scores };

    for (const analysis of analyses) {
      for (const [level, impact] of Object.entries(analysis.levelScoreImpacts)) {
        const maslowLevel = level as MaslowLevel;
        // Weighted update: new observations have less impact to prevent volatility
        const weight = analysis.confidence * 0.3;
        newScores[maslowLevel] = Math.max(
          0,
          Math.min(100, newScores[maslowLevel] + impact * weight)
        );
      }
    }

    const snapshot: MaslowScoreSnapshot = {
      timestamp: new Date(),
      scores: { ...newScores },
      trigger: 'journal_entry',
    };

    return {
      ...currentProfile,
      scores: newScores,
      lastUpdated: new Date(),
      history: [...currentProfile.history, snapshot].slice(-100), // Keep last 100 snapshots
    };
  }

  /**
   * Update Maslow profile based on commitment check-ins
   */
  updateProfileFromCommitments(
    currentProfile: MaslowProfile,
    commitments: Commitment[],
    recentCheckIns: CommitmentCheckIn[]
  ): MaslowProfile {
    const newScores = { ...currentProfile.scores };

    // Group check-ins by Maslow level
    const checkInsByLevel = new Map<MaslowLevel, CommitmentCheckIn[]>();
    for (const commitment of commitments) {
      const level = commitment.maslowLevel;
      const commitmentCheckIns = recentCheckIns.filter(
        (ci) => ci.commitmentId === commitment.id
      );

      if (!checkInsByLevel.has(level)) {
        checkInsByLevel.set(level, []);
      }
      checkInsByLevel.get(level)!.push(...commitmentCheckIns);
    }

    // Calculate impact for each level
    for (const [level, checkIns] of checkInsByLevel) {
      if (checkIns.length === 0) continue;

      const successRate = checkIns.filter((ci) => ci.completed).length / checkIns.length;
      // Map success rate to score impact: 0% = -5, 50% = 0, 100% = +5
      const impact = (successRate - 0.5) * 10;

      // Apply with dampening to prevent volatility
      const weight = Math.min(checkIns.length / 10, 1) * 0.2;
      newScores[level] = Math.max(0, Math.min(100, newScores[level] + impact * weight));
    }

    const snapshot: MaslowScoreSnapshot = {
      timestamp: new Date(),
      scores: { ...newScores },
      trigger: 'commitment_update',
    };

    return {
      ...currentProfile,
      scores: newScores,
      lastUpdated: new Date(),
      history: [...currentProfile.history, snapshot].slice(-100),
    };
  }

  /**
   * Get recommended focus areas based on profile
   */
  getRecommendedFocusAreas(profile: MaslowProfile, maxAreas: number = 2): MaslowLevel[] {
    const sortedLevels = Object.entries(profile.scores)
      .sort(([, a], [, b]) => a - b) // Sort by score ascending (lowest first)
      .map(([level]) => level as MaslowLevel);

    // Filter to only levels below threshold
    const needsAttention = sortedLevels.filter(
      (level) => profile.scores[level] < 60
    );

    // Also respect Maslow hierarchy - prioritize lower levels
    needsAttention.sort((a, b) => MaslowLevelOrder[a] - MaslowLevelOrder[b]);

    return needsAttention.slice(0, maxAreas);
  }

  /**
   * Generate insights based on profile trends
   */
  generateInsights(profile: MaslowProfile): string[] {
    const insights: string[] = [];
    const history = profile.history;

    if (history.length < 2) {
      insights.push('Keep journaling to receive personalized insights about your wellbeing.');
      return insights;
    }

    // Compare current to historical average
    const recentScores = profile.scores;
    const historicalAvg = this.calculateHistoricalAverage(history.slice(0, -1));

    for (const level of Object.values(MaslowLevel)) {
      const current = recentScores[level];
      const historical = historicalAvg[level];
      const diff = current - historical;

      if (diff > 10) {
        insights.push(`Your ${level.replace('_', ' ')} satisfaction is trending upward. Keep it up!`);
      } else if (diff < -10) {
        insights.push(`Your ${level.replace('_', ' ')} needs may need more attention lately.`);
      }
    }

    // Overall wellbeing insight
    const currentWellbeing = calculateWellbeingScore(recentScores);
    const primaryFocus = getRecommendedFocusLevel(recentScores);
    insights.push(
      `Your overall wellbeing score is ${currentWellbeing}. Consider focusing on ${primaryFocus.replace('_', ' ')}.`
    );

    return insights.slice(0, 5);
  }

  /**
   * Calculate sentiment of surrounding context
   */
  private calculateContextSentiment(context: string[]): number {
    let positive = 0;
    let negative = 0;

    for (const word of context) {
      if (POSITIVE_MODIFIERS.includes(word)) positive++;
      if (NEGATIVE_MODIFIERS.includes(word)) negative++;
    }

    if (positive === 0 && negative === 0) return 0.5; // Neutral
    return (positive - negative + 1) / 2; // Normalize to 0-1, then shift to -1 to 1
  }

  /**
   * Calculate overall sentiment of text
   */
  private calculateOverallSentiment(text: string): number {
    const words = text.split(/\s+/);
    let positive = 0;
    let negative = 0;

    for (const word of words) {
      if (POSITIVE_MODIFIERS.some((mod) => word.includes(mod))) positive++;
      if (NEGATIVE_MODIFIERS.some((mod) => word.includes(mod))) negative++;
    }

    const total = positive + negative;
    if (total === 0) return 0;
    return (positive - negative) / total;
  }

  /**
   * Calculate historical average scores
   */
  private calculateHistoricalAverage(
    history: MaslowScoreSnapshot[]
  ): Record<MaslowLevel, number> {
    const sums: Record<MaslowLevel, number> = {
      physiological: 0,
      safety: 0,
      love_belonging: 0,
      esteem: 0,
      self_actualization: 0,
    } as Record<MaslowLevel, number>;

    for (const snapshot of history) {
      for (const level of Object.values(MaslowLevel)) {
        sums[level] += snapshot.scores[level];
      }
    }

    const avg: Record<MaslowLevel, number> = {} as Record<MaslowLevel, number>;
    for (const level of Object.values(MaslowLevel)) {
      avg[level] = history.length > 0 ? sums[level] / history.length : 50;
    }

    return avg;
  }
}

/**
 * Create a default Maslow analyzer instance
 */
export function createMaslowAnalyzer(): MaslowAnalyzer {
  return new MaslowAnalyzer();
}

/**
 * Create an initial Maslow profile for a new user
 */
export function createInitialProfile(userId: string): MaslowProfile {
  return {
    userId,
    scores: {
      physiological: 50,
      safety: 50,
      love_belonging: 50,
      esteem: 50,
      self_actualization: 50,
    } as Record<MaslowLevel, number>,
    lastUpdated: new Date(),
    history: [],
  };
}
