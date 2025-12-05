/**
 * Commitment-Specific Predictor
 *
 * Specialized predictor for individual commitments that combines
 * user history, commitment characteristics, and contextual factors.
 */

import type {
  Commitment,
  CommitmentCheckIn,
  CommitmentFrequency,
  MaslowLevel,
  MaslowProfile,
} from '@enso/core';

import { PredictionEngine, PredictionFactors, createPredictionEngine } from './prediction-engine';
import { PredictionResult, BetaParams, createPrediction } from './beta-distribution';

/**
 * User's historical performance data
 */
export interface UserHistory {
  allCheckIns: CommitmentCheckIn[];
  checkInsByCategory: Map<string, CommitmentCheckIn[]>;
  checkInsByMaslowLevel: Map<MaslowLevel, CommitmentCheckIn[]>;
  checkInsByFrequency: Map<CommitmentFrequency, CommitmentCheckIn[]>;
  activeCommitmentCount: number;
}

/**
 * Commitment Predictor class
 */
export class CommitmentPredictor {
  private engine: PredictionEngine;

  constructor(engine?: PredictionEngine) {
    this.engine = engine ?? createPredictionEngine();
  }

  /**
   * Predict success probability for a specific commitment
   */
  predictCommitment(
    commitment: Commitment,
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): PredictionResult {
    const factors = this.buildFactors(commitment, userHistory, maslowProfile);
    return this.engine.predict(factors, commitment.checkIns);
  }

  /**
   * Predict success for a new commitment before it's created
   */
  predictNewCommitment(
    category: string,
    maslowLevel: MaslowLevel,
    frequency: CommitmentFrequency,
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): PredictionResult {
    const factors = this.buildNewCommitmentFactors(
      category,
      maslowLevel,
      frequency,
      userHistory,
      maslowProfile
    );

    // Use only historical data for new commitments
    const relevantCheckIns = [
      ...(userHistory.checkInsByCategory.get(category) ?? []),
      ...(userHistory.checkInsByMaslowLevel.get(maslowLevel) ?? []),
    ].slice(0, 20); // Limit sample size

    return this.engine.predict(factors, relevantCheckIns);
  }

  /**
   * Get personalized commitment suggestions based on prediction
   */
  rankCommitmentSuggestions(
    suggestions: Array<{ category: string; maslowLevel: MaslowLevel; frequency: CommitmentFrequency }>,
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): Array<{ suggestion: typeof suggestions[0]; prediction: PredictionResult }> {
    const ranked = suggestions.map((suggestion) => ({
      suggestion,
      prediction: this.predictNewCommitment(
        suggestion.category,
        suggestion.maslowLevel,
        suggestion.frequency,
        userHistory,
        maslowProfile
      ),
    }));

    // Sort by probability of success (descending)
    ranked.sort((a, b) => b.prediction.probability - a.prediction.probability);

    return ranked;
  }

  /**
   * Calculate optimal difficulty for user
   * Returns the target probability range where user is likely to succeed but still challenged
   */
  calculateOptimalDifficulty(userHistory: UserHistory): { min: number; max: number } {
    const overallSuccessRate = this.calculateOverallSuccessRate(userHistory);

    // Sweet spot is slightly below historical rate to provide challenge
    // but not so hard that user gets discouraged
    if (overallSuccessRate >= 0.8) {
      return { min: 0.65, max: 0.80 };
    } else if (overallSuccessRate >= 0.6) {
      return { min: 0.55, max: 0.75 };
    } else if (overallSuccessRate >= 0.4) {
      return { min: 0.45, max: 0.65 };
    } else {
      // User struggling - suggest easier commitments
      return { min: 0.60, max: 0.85 };
    }
  }

  /**
   * Identify at-risk commitments that may need intervention
   */
  identifyAtRiskCommitments(
    commitments: Commitment[],
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): Array<{ commitment: Commitment; prediction: PredictionResult; riskLevel: 'low' | 'medium' | 'high' }> {
    const atRisk: Array<{ commitment: Commitment; prediction: PredictionResult; riskLevel: 'low' | 'medium' | 'high' }> = [];

    for (const commitment of commitments) {
      if (commitment.status !== 'active') continue;

      const prediction = this.predictCommitment(commitment, userHistory, maslowProfile);

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (prediction.probability < 0.3) {
        riskLevel = 'high';
      } else if (prediction.probability < 0.5) {
        riskLevel = 'medium';
      }

      if (riskLevel !== 'low') {
        atRisk.push({ commitment, prediction, riskLevel });
      }
    }

    // Sort by risk level (high first)
    atRisk.sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    });

    return atRisk;
  }

  /**
   * Build prediction factors for existing commitment
   */
  private buildFactors(
    commitment: Commitment,
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): PredictionFactors {
    const now = new Date();
    const commitmentStart = new Date(commitment.startDate);

    // Calculate current streak
    const sortedCheckIns = [...commitment.checkIns].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let currentStreak = 0;
    for (const checkIn of sortedCheckIns) {
      if (checkIn.completed) currentStreak++;
      else break;
    }

    // Calculate days since last success
    const lastSuccess = sortedCheckIns.find((c) => c.completed);
    const daysSinceLastSuccess = lastSuccess
      ? Math.floor((now.getTime() - new Date(lastSuccess.timestamp).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      userHistoricalRate: this.calculateOverallSuccessRate(userHistory),
      categoryHistoricalRate: this.calculateCategorySuccessRate(userHistory, commitment.category),
      maslowLevelRate: this.calculateMaslowLevelSuccessRate(userHistory, commitment.maslowLevel),
      frequencyRate: this.calculateFrequencySuccessRate(userHistory, commitment.frequency),
      currentStreak,
      daysSinceLastSuccess,
      commitmentAge: Math.floor((now.getTime() - commitmentStart.getTime()) / (1000 * 60 * 60 * 24)),
      concurrentCommitments: userHistory.activeCommitmentCount,
      hourOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      maslowScores: maslowProfile.scores,
      targetMaslowLevel: commitment.maslowLevel,
    };
  }

  /**
   * Build prediction factors for new commitment
   */
  private buildNewCommitmentFactors(
    category: string,
    maslowLevel: MaslowLevel,
    frequency: CommitmentFrequency,
    userHistory: UserHistory,
    maslowProfile: MaslowProfile
  ): PredictionFactors {
    const now = new Date();

    return {
      userHistoricalRate: this.calculateOverallSuccessRate(userHistory),
      categoryHistoricalRate: this.calculateCategorySuccessRate(userHistory, category),
      maslowLevelRate: this.calculateMaslowLevelSuccessRate(userHistory, maslowLevel),
      frequencyRate: this.calculateFrequencySuccessRate(userHistory, frequency),
      currentStreak: 0,
      daysSinceLastSuccess: 0,
      commitmentAge: 0,
      concurrentCommitments: userHistory.activeCommitmentCount + 1,
      hourOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      maslowScores: maslowProfile.scores,
      targetMaslowLevel: maslowLevel,
    };
  }

  private calculateOverallSuccessRate(userHistory: UserHistory): number {
    if (userHistory.allCheckIns.length === 0) return 0.5; // Prior
    const successes = userHistory.allCheckIns.filter((c) => c.completed).length;
    return successes / userHistory.allCheckIns.length;
  }

  private calculateCategorySuccessRate(userHistory: UserHistory, category: string): number {
    const checkIns = userHistory.checkInsByCategory.get(category);
    if (!checkIns || checkIns.length === 0) return 0;
    const successes = checkIns.filter((c) => c.completed).length;
    return successes / checkIns.length;
  }

  private calculateMaslowLevelSuccessRate(userHistory: UserHistory, level: MaslowLevel): number {
    const checkIns = userHistory.checkInsByMaslowLevel.get(level);
    if (!checkIns || checkIns.length === 0) return 0;
    const successes = checkIns.filter((c) => c.completed).length;
    return successes / checkIns.length;
  }

  private calculateFrequencySuccessRate(userHistory: UserHistory, frequency: CommitmentFrequency): number {
    const checkIns = userHistory.checkInsByFrequency.get(frequency);
    if (!checkIns || checkIns.length === 0) return 0;
    const successes = checkIns.filter((c) => c.completed).length;
    return successes / checkIns.length;
  }
}

/**
 * Create a default commitment predictor instance
 */
export function createCommitmentPredictor(engine?: PredictionEngine): CommitmentPredictor {
  return new CommitmentPredictor(engine);
}
