/**
 * Enso Core Constants
 */

// API Configuration
export const API_VERSION = 'v1';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Journal Entry Limits
export const MAX_JOURNAL_CONTENT_LENGTH = 50000; // ~10,000 words
export const MAX_JOURNAL_TITLE_LENGTH = 200;
export const MAX_TAGS_PER_ENTRY = 20;

// Commitment Limits
export const MAX_ACTIVE_COMMITMENTS = 10;
export const MAX_COMMITMENT_TITLE_LENGTH = 200;
export const MAX_COMMITMENT_DESCRIPTION_LENGTH = 2000;

// Bayesian Model Parameters
export const BAYESIAN_PRIOR_ALPHA = 2; // Prior successes
export const BAYESIAN_PRIOR_BETA = 2; // Prior failures
export const MIN_DATA_POINTS_FOR_PREDICTION = 3;
export const CONFIDENCE_LEVEL = 0.95;

// Maslow Score Thresholds
export const MASLOW_UNSATISFIED_THRESHOLD = 40;
export const MASLOW_NEUTRAL_THRESHOLD = 60;
export const MASLOW_SATISFIED_THRESHOLD = 80;

// Streak Configuration
export const STREAK_GRACE_PERIOD_HOURS = 36; // Allow some flexibility

// AI Agent Configuration
export const AI_MAX_CONVERSATION_TURNS = 50;
export const AI_RESPONSE_MAX_TOKENS = 1000;

// Mood and Energy Scales
export const MOOD_SCALE_MIN = 1;
export const MOOD_SCALE_MAX = 10;
export const ENERGY_SCALE_MIN = 1;
export const ENERGY_SCALE_MAX = 10;

// Risk Indicator Thresholds
export const RISK_DETECTION_WINDOW_DAYS = 7;
export const RISK_NEGATIVE_SENTIMENT_THRESHOLD = -0.5;
export const RISK_LOW_MOOD_THRESHOLD = 3;

// Date Formats
export const DATE_FORMAT_DISPLAY = 'MMM d, yyyy';
export const DATE_FORMAT_ISO = 'yyyy-MM-dd';
export const TIME_FORMAT_DISPLAY = 'h:mm a';
export const DATETIME_FORMAT_DISPLAY = 'MMM d, yyyy h:mm a';

// Cache TTL (in seconds)
export const CACHE_TTL_USER = 300; // 5 minutes
export const CACHE_TTL_STATS = 60; // 1 minute
export const CACHE_TTL_PREDICTIONS = 3600; // 1 hour
