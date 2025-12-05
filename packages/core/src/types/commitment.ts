import { z } from 'zod';
import { MaslowLevel, MaslowLevelSchema } from './maslow';

/**
 * Commitment - A user's promise to themselves
 *
 * Commitments are the core of Enso's behavior change framework.
 * Each commitment is categorized by Maslow level and tracked over time.
 */

export enum CommitmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  ABANDONED = 'abandoned',
}

export enum CommitmentFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

export interface Commitment {
  id: string;
  userId: string;
  title: string;
  description: string;
  maslowLevel: MaslowLevel;
  category: string;
  status: CommitmentStatus;
  frequency: CommitmentFrequency;
  customFrequencyDays?: number;
  startDate: Date;
  endDate?: Date;
  targetCount?: number;
  currentCount: number;
  successProbability: number; // 0-1, Bayesian prediction
  confidenceInterval: [number, number]; // 95% CI
  checkIns: CommitmentCheckIn[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CommitmentCheckIn {
  id: string;
  commitmentId: string;
  timestamp: Date;
  completed: boolean;
  notes?: string;
  mood?: number; // 1-5 scale
  difficulty?: number; // 1-5 scale
  contextFactors?: ContextFactor[];
}

export interface ContextFactor {
  type: 'time_of_day' | 'day_of_week' | 'location' | 'social' | 'energy' | 'stress' | 'weather';
  value: string | number;
}

/**
 * Commitment Template - AI-suggested commitments
 */
export interface CommitmentTemplate {
  id: string;
  title: string;
  description: string;
  maslowLevel: MaslowLevel;
  category: string;
  suggestedFrequency: CommitmentFrequency;
  difficulty: 'easy' | 'medium' | 'hard';
  averageSuccessRate: number;
  prerequisites?: string[];
  tips: string[];
}

/**
 * Commitment Suggestion - Personalized AI recommendation
 */
export interface CommitmentSuggestion {
  template: CommitmentTemplate;
  personalizedReason: string;
  predictedSuccessProbability: number;
  confidenceInterval: [number, number];
  relevantJournalEntries: string[];
  timing: 'now' | 'soon' | 'later';
  alternativeSuggestions?: CommitmentTemplate[];
}

// Zod Schemas
export const CommitmentStatusSchema = z.nativeEnum(CommitmentStatus);
export const CommitmentFrequencySchema = z.nativeEnum(CommitmentFrequency);

export const ContextFactorSchema = z.object({
  type: z.enum(['time_of_day', 'day_of_week', 'location', 'social', 'energy', 'stress', 'weather']),
  value: z.union([z.string(), z.number()]),
});

export const CommitmentCheckInSchema = z.object({
  id: z.string().uuid(),
  commitmentId: z.string().uuid(),
  timestamp: z.date(),
  completed: z.boolean(),
  notes: z.string().optional(),
  mood: z.number().min(1).max(5).optional(),
  difficulty: z.number().min(1).max(5).optional(),
  contextFactors: z.array(ContextFactorSchema).optional(),
});

export const CommitmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  maslowLevel: MaslowLevelSchema,
  category: z.string(),
  status: CommitmentStatusSchema,
  frequency: CommitmentFrequencySchema,
  customFrequencyDays: z.number().min(1).optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  targetCount: z.number().min(1).optional(),
  currentCount: z.number().min(0),
  successProbability: z.number().min(0).max(1),
  confidenceInterval: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]),
  checkIns: z.array(CommitmentCheckInSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateCommitmentInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  maslowLevel: MaslowLevelSchema,
  category: z.string(),
  frequency: CommitmentFrequencySchema,
  customFrequencyDays: z.number().min(1).optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  targetCount: z.number().min(1).optional(),
});

export type CreateCommitmentInput = z.infer<typeof CreateCommitmentInputSchema>;

/**
 * Calculate commitment streak
 */
export function calculateStreak(checkIns: CommitmentCheckIn[]): number {
  const sortedCheckIns = [...checkIns].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  let streak = 0;
  for (const checkIn of sortedCheckIns) {
    if (checkIn.completed) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Calculate historical success rate
 */
export function calculateSuccessRate(checkIns: CommitmentCheckIn[]): number {
  if (checkIns.length === 0) return 0;

  const completed = checkIns.filter((c) => c.completed).length;
  return completed / checkIns.length;
}
