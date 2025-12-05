import { z } from 'zod';

/**
 * Maslow's Hierarchy of Needs - Core Framework
 *
 * The five levels represent human psychological needs in order of priority.
 * Lower levels must be satisfied before higher levels become motivating.
 */

export enum MaslowLevel {
  PHYSIOLOGICAL = 'physiological',
  SAFETY = 'safety',
  LOVE_BELONGING = 'love_belonging',
  ESTEEM = 'esteem',
  SELF_ACTUALIZATION = 'self_actualization',
}

export const MaslowLevelOrder: Record<MaslowLevel, number> = {
  [MaslowLevel.PHYSIOLOGICAL]: 1,
  [MaslowLevel.SAFETY]: 2,
  [MaslowLevel.LOVE_BELONGING]: 3,
  [MaslowLevel.ESTEEM]: 4,
  [MaslowLevel.SELF_ACTUALIZATION]: 5,
};

export const MaslowLevelMetadata: Record<MaslowLevel, MaslowLevelInfo> = {
  [MaslowLevel.PHYSIOLOGICAL]: {
    level: MaslowLevel.PHYSIOLOGICAL,
    order: 1,
    name: 'Physiological',
    description: 'Basic survival needs: food, water, sleep, health, exercise',
    color: '#E57373',
    icon: 'heart-pulse',
    categories: ['sleep', 'nutrition', 'exercise', 'hydration', 'health', 'rest'],
  },
  [MaslowLevel.SAFETY]: {
    level: MaslowLevel.SAFETY,
    order: 2,
    name: 'Safety',
    description: 'Security and stability: finances, employment, health security',
    color: '#FFB74D',
    icon: 'shield-check',
    categories: ['finances', 'employment', 'housing', 'insurance', 'savings', 'stability'],
  },
  [MaslowLevel.LOVE_BELONGING]: {
    level: MaslowLevel.LOVE_BELONGING,
    order: 3,
    name: 'Love & Belonging',
    description: 'Connection and relationships: family, friends, community, intimacy',
    color: '#81C784',
    icon: 'users',
    categories: ['family', 'friends', 'romance', 'community', 'social', 'connection'],
  },
  [MaslowLevel.ESTEEM]: {
    level: MaslowLevel.ESTEEM,
    order: 4,
    name: 'Esteem',
    description: 'Self-worth and recognition: achievement, respect, confidence',
    color: '#64B5F6',
    icon: 'award',
    categories: ['achievement', 'recognition', 'confidence', 'skills', 'career', 'status'],
  },
  [MaslowLevel.SELF_ACTUALIZATION]: {
    level: MaslowLevel.SELF_ACTUALIZATION,
    order: 5,
    name: 'Self-Actualization',
    description: 'Reaching full potential: creativity, purpose, personal growth',
    color: '#BA68C8',
    icon: 'sparkles',
    categories: ['creativity', 'purpose', 'growth', 'learning', 'spirituality', 'legacy'],
  },
};

export interface MaslowLevelInfo {
  level: MaslowLevel;
  order: number;
  name: string;
  description: string;
  color: string;
  icon: string;
  categories: string[];
}

/**
 * User's current satisfaction score for each Maslow level
 * Scale: 0-100 where 0 is completely unsatisfied, 100 is fully satisfied
 */
export interface MaslowProfile {
  userId: string;
  scores: Record<MaslowLevel, number>;
  lastUpdated: Date;
  history: MaslowScoreSnapshot[];
}

export interface MaslowScoreSnapshot {
  timestamp: Date;
  scores: Record<MaslowLevel, number>;
  trigger?: 'journal_entry' | 'commitment_update' | 'manual' | 'ai_analysis';
}

// Zod schemas for validation
export const MaslowLevelSchema = z.nativeEnum(MaslowLevel);

export const MaslowScoresSchema = z.object({
  [MaslowLevel.PHYSIOLOGICAL]: z.number().min(0).max(100),
  [MaslowLevel.SAFETY]: z.number().min(0).max(100),
  [MaslowLevel.LOVE_BELONGING]: z.number().min(0).max(100),
  [MaslowLevel.ESTEEM]: z.number().min(0).max(100),
  [MaslowLevel.SELF_ACTUALIZATION]: z.number().min(0).max(100),
});

export const MaslowProfileSchema = z.object({
  userId: z.string().uuid(),
  scores: MaslowScoresSchema,
  lastUpdated: z.date(),
  history: z.array(z.object({
    timestamp: z.date(),
    scores: MaslowScoresSchema,
    trigger: z.enum(['journal_entry', 'commitment_update', 'manual', 'ai_analysis']).optional(),
  })),
});

/**
 * Get the recommended focus level based on current scores
 * Following Maslow's theory, lower unsatisfied needs take priority
 */
export function getRecommendedFocusLevel(scores: Record<MaslowLevel, number>): MaslowLevel {
  const threshold = 60; // Below this, the need is considered unsatisfied

  const levels = Object.values(MaslowLevel).sort(
    (a, b) => MaslowLevelOrder[a] - MaslowLevelOrder[b]
  );

  for (const level of levels) {
    if (scores[level] < threshold) {
      return level;
    }
  }

  // All needs satisfied, focus on self-actualization
  return MaslowLevel.SELF_ACTUALIZATION;
}

/**
 * Calculate overall well-being score with weighted average
 * Lower levels are weighted more heavily as they are foundational
 */
export function calculateWellbeingScore(scores: Record<MaslowLevel, number>): number {
  const weights = {
    [MaslowLevel.PHYSIOLOGICAL]: 0.25,
    [MaslowLevel.SAFETY]: 0.22,
    [MaslowLevel.LOVE_BELONGING]: 0.20,
    [MaslowLevel.ESTEEM]: 0.18,
    [MaslowLevel.SELF_ACTUALIZATION]: 0.15,
  };

  let weightedSum = 0;

  for (const level of Object.values(MaslowLevel)) {
    weightedSum += scores[level] * weights[level];
  }

  return Math.round(weightedSum);
}
