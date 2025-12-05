import { z } from 'zod';
import { MaslowLevel, MaslowLevelSchema } from './maslow';

/**
 * Journal Entry - The core content type in Enso
 *
 * Journal entries support rich text and AI interaction.
 * The AI agent analyzes entries to extract insights and update Maslow scores.
 */

export enum JournalEntryType {
  FREE_WRITE = 'free_write',
  PROMPTED = 'prompted',
  REFLECTION = 'reflection',
  GRATITUDE = 'gratitude',
  GOAL_SETTING = 'goal_setting',
  CHECK_IN = 'check_in',
}

export interface JournalEntry {
  id: string;
  userId: string;
  type: JournalEntryType;
  title?: string;
  content: string;
  promptId?: string;
  prompt?: JournalPrompt;
  mood: number; // 1-10 scale
  energy: number; // 1-10 scale
  aiAnalysis?: JournalAnalysis;
  aiConversation: AIMessage[];
  tags: string[];
  linkedCommitments: string[];
  maslowLevelsDetected: MaslowLevel[];
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalPrompt {
  id: string;
  text: string;
  category: string;
  maslowLevel?: MaslowLevel;
  difficulty: 'easy' | 'medium' | 'deep';
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    analysisTriggered?: boolean;
    suggestionsOffered?: boolean;
    emotionalTone?: string;
  };
}

export interface JournalAnalysis {
  id: string;
  entryId: string;
  timestamp: Date;
  sentimentScore: number; // -1 to 1
  emotionalTones: EmotionalTone[];
  maslowScoreImpacts: Partial<Record<MaslowLevel, number>>;
  extractedThemes: string[];
  suggestedCommitments: string[];
  insightSummary: string;
  riskIndicators?: RiskIndicator[];
}

export interface EmotionalTone {
  emotion: string;
  intensity: number; // 0-1
  context?: string;
}

export interface RiskIndicator {
  type: 'stress' | 'burnout' | 'isolation' | 'anxiety' | 'depression';
  severity: 'low' | 'medium' | 'high';
  evidenceQuotes: string[];
  suggestedResources?: string[];
}

/**
 * Daily Summary - AI-generated overview of the day
 */
export interface DailySummary {
  id: string;
  userId: string;
  date: Date;
  entryCount: number;
  averageMood: number;
  averageEnergy: number;
  dominantEmotions: string[];
  maslowFocus: MaslowLevel[];
  commitmentProgress: {
    completed: number;
    total: number;
  };
  aiInsight: string;
  gratitudeHighlights: string[];
}

// Zod Schemas
export const JournalEntryTypeSchema = z.nativeEnum(JournalEntryType);

export const AIMessageSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
  metadata: z.object({
    analysisTriggered: z.boolean().optional(),
    suggestionsOffered: z.boolean().optional(),
    emotionalTone: z.string().optional(),
  }).optional(),
});

export const EmotionalToneSchema = z.object({
  emotion: z.string(),
  intensity: z.number().min(0).max(1),
  context: z.string().optional(),
});

export const RiskIndicatorSchema = z.object({
  type: z.enum(['stress', 'burnout', 'isolation', 'anxiety', 'depression']),
  severity: z.enum(['low', 'medium', 'high']),
  evidenceQuotes: z.array(z.string()),
  suggestedResources: z.array(z.string()).optional(),
});

export const JournalAnalysisSchema = z.object({
  id: z.string().uuid(),
  entryId: z.string().uuid(),
  timestamp: z.date(),
  sentimentScore: z.number().min(-1).max(1),
  emotionalTones: z.array(EmotionalToneSchema),
  maslowScoreImpacts: z.record(MaslowLevelSchema, z.number()).partial(),
  extractedThemes: z.array(z.string()),
  suggestedCommitments: z.array(z.string()),
  insightSummary: z.string(),
  riskIndicators: z.array(RiskIndicatorSchema).optional(),
});

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: JournalEntryTypeSchema,
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  promptId: z.string().uuid().optional(),
  mood: z.number().min(1).max(10),
  energy: z.number().min(1).max(10),
  aiAnalysis: JournalAnalysisSchema.optional(),
  aiConversation: z.array(AIMessageSchema),
  tags: z.array(z.string()),
  linkedCommitments: z.array(z.string().uuid()),
  maslowLevelsDetected: z.array(MaslowLevelSchema),
  wordCount: z.number().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateJournalEntryInputSchema = z.object({
  type: JournalEntryTypeSchema.default(JournalEntryType.FREE_WRITE),
  title: z.string().max(200).optional(),
  content: z.string().min(1),
  promptId: z.string().uuid().optional(),
  mood: z.number().min(1).max(10),
  energy: z.number().min(1).max(10),
  tags: z.array(z.string()).default([]),
});

export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

/**
 * Calculate word count from content
 */
export function calculateWordCount(content: string): number {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Extract potential tags from content using simple heuristics
 */
export function extractPotentialTags(content: string): string[] {
  // Extract hashtags
  const hashtagRegex = /#(\w+)/g;
  const hashtags = [...content.matchAll(hashtagRegex)].map((m) => m[1].toLowerCase());

  return [...new Set(hashtags)];
}
