import { z } from 'zod';
import { MaslowLevel, MaslowScoresSchema } from './maslow';

/**
 * User - Enso user account and preferences
 */

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  timezone: string;
  preferences: UserPreferences;
  subscription: SubscriptionTier;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
  PRO = 'pro',
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  dailyReminderTime?: string; // HH:mm format
  weeklyReviewDay?: number; // 0-6 (Sunday-Saturday)
  aiPersonality: AIPersonality;
  privacySettings: PrivacySettings;
  focusAreas: MaslowLevel[];
}

export type AIPersonality =
  | 'supportive' // Warm, encouraging, empathetic
  | 'coach' // Direct, goal-oriented, challenging
  | 'curious' // Explorative, questioning, philosophical
  | 'balanced'; // Mix of all approaches

export interface PrivacySettings {
  shareAnonymousData: boolean;
  allowAILearning: boolean;
  dataRetentionDays: number;
}

/**
 * User Stats - Aggregated user statistics
 */
export interface UserStats {
  userId: string;
  totalJournalEntries: number;
  totalCommitments: number;
  activeCommitments: number;
  completedCommitments: number;
  currentStreak: number;
  longestStreak: number;
  averageMood: number;
  averageEnergy: number;
  maslowScores: Record<MaslowLevel, number>;
  lastActiveAt: Date;
}

/**
 * Onboarding State - Track onboarding progress
 */
export interface OnboardingState {
  userId: string;
  currentStep: number;
  completedSteps: OnboardingStep[];
  initialMaslowAssessment?: Record<MaslowLevel, number>;
  selectedFocusAreas?: MaslowLevel[];
  preferredAIPersonality?: AIPersonality;
  firstCommitmentCreated: boolean;
  firstJournalEntryCreated: boolean;
}

export enum OnboardingStep {
  WELCOME = 'welcome',
  MASLOW_ASSESSMENT = 'maslow_assessment',
  FOCUS_AREAS = 'focus_areas',
  AI_PERSONALITY = 'ai_personality',
  FIRST_JOURNAL = 'first_journal',
  FIRST_COMMITMENT = 'first_commitment',
  COMPLETE = 'complete',
}

// Zod Schemas
export const SubscriptionTierSchema = z.nativeEnum(SubscriptionTier);
export const OnboardingStepSchema = z.nativeEnum(OnboardingStep);

export const AIPersonalitySchema = z.enum(['supportive', 'coach', 'curious', 'balanced']);

export const PrivacySettingsSchema = z.object({
  shareAnonymousData: z.boolean(),
  allowAILearning: z.boolean(),
  dataRetentionDays: z.number().min(30).max(365),
});

export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  notificationsEnabled: z.boolean(),
  dailyReminderTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  weeklyReviewDay: z.number().min(0).max(6).optional(),
  aiPersonality: AIPersonalitySchema,
  privacySettings: PrivacySettingsSchema,
  focusAreas: z.array(z.nativeEnum(MaslowLevel)),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  avatarUrl: z.string().url().optional(),
  timezone: z.string(),
  preferences: UserPreferencesSchema,
  subscription: SubscriptionTierSchema,
  onboardingCompleted: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  timezone: z.string().default('UTC'),
});

export const UpdateUserInputSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  timezone: z.string().optional(),
  preferences: UserPreferencesSchema.partial().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;

/**
 * Get default user preferences
 */
export function getDefaultPreferences(): UserPreferences {
  return {
    theme: 'system',
    notificationsEnabled: true,
    aiPersonality: 'supportive',
    privacySettings: {
      shareAnonymousData: false,
      allowAILearning: true,
      dataRetentionDays: 365,
    },
    focusAreas: [],
  };
}
