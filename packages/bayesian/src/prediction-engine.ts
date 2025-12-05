/**
 * Bayesian Prediction Engine
 *
 * Core engine for making predictions about commitment success.
 * Combines multiple factors using hierarchical Bayesian modeling.
 */

import {
  BetaParams,
  PredictionResult,
  betaMean,
  betaCredibleInterval,
  betaVariance,
  updateBeta,
  createPrediction,
} from './beta-distribution';

import type {
  MaslowLevel,
  Commitment,
  CommitmentCheckIn,
  CommitmentFrequency,
} from '@enso/core';

import {
  BAYESIAN_PRIOR_ALPHA,
  BAYESIAN_PRIOR_BETA,
  MIN_DATA_POINTS_FOR_PREDICTION,
} from '@enso/core';

/**
 * Factors that influence commitment success
 */
export interface PredictionFactors {
  // Historical performance
  userHistoricalRate: number; // User's overall success rate
  categoryHistoricalRate: number; // Success rate for this category
  maslowLevelRate: number; // Success rate for this Maslow level
  frequencyRate: number; // Success rate for this frequency type

  // Context factors
  currentStreak: number;
  daysSinceLastSuccess: number;
  commitmentAge: number; // Days since commitment started
  concurrentCommitments: number; // Number of active commitments

  // Time-based factors
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  isWeekend: boolean;

  // Maslow hierarchy status
  maslowScores: Record<MaslowLevel, number>;
  targetMaslowLevel: MaslowLevel;
}

/**
 * Configuration for the prediction model
 */
export interface PredictionConfig {
  priorAlpha: number;
  priorBeta: number;
  minDataPoints: number;
  factorWeights: FactorWeights;
}

export interface FactorWeights {
  historical: number;
  category: number;
  maslowLevel: number;
  frequency: number;
  streak: number;
  recency: number;
  load: number;
  temporal: number;
  hierarchy: number;
}

const DEFAULT_WEIGHTS: FactorWeights = {
  historical: 0.25,
  category: 0.15,
  maslowLevel: 0.12,
  frequency: 0.10,
  streak: 0.10,
  recency: 0.08,
  load: 0.08,
  temporal: 0.05,
  hierarchy: 0.07,
};

/**
 * Main Prediction Engine class
 */
export class PredictionEngine {
  private config: PredictionConfig;

  constructor(config?: Partial<PredictionConfig>) {
    this.config = {
      priorAlpha: config?.priorAlpha ?? BAYESIAN_PRIOR_ALPHA,
      priorBeta: config?.priorBeta ?? BAYESIAN_PRIOR_BETA,
      minDataPoints: config?.minDataPoints ?? MIN_DATA_POINTS_FOR_PREDICTION,
      factorWeights: config?.factorWeights ?? DEFAULT_WEIGHTS,
    };
  }

  /**
   * Get default prior parameters
   */
  getDefaultPrior(): BetaParams {
    return {
      alpha: this.config.priorAlpha,
      beta: this.config.priorBeta,
    };
  }

  /**
   * Calculate posterior from check-in history
   */
  calculatePosterior(checkIns: CommitmentCheckIn[], prior?: BetaParams): BetaParams {
    const basePrior = prior ?? this.getDefaultPrior();

    let params = { ...basePrior };
    for (const checkIn of checkIns) {
      params = updateBeta(params, checkIn.completed);
    }

    return params;
  }

  /**
   * Make a simple prediction based on historical data
   */
  simplePredict(checkIns: CommitmentCheckIn[]): PredictionResult {
    const posterior = this.calculatePosterior(checkIns);
    return createPrediction(posterior);
  }

  /**
   * Make a comprehensive prediction using all available factors
   */
  predict(factors: PredictionFactors, checkIns: CommitmentCheckIn[]): PredictionResult {
    const weights = this.config.factorWeights;

    // Calculate base posterior from check-in history
    const historicalPosterior = this.calculatePosterior(checkIns);
    const historicalProb = betaMean(historicalPosterior.alpha, historicalPosterior.beta);

    // Calculate individual factor contributions
    const factorContributions = this.calculateFactorContributions(factors, historicalProb);

    // Combine factors using weighted average
    let combinedProb = 0;
    let totalWeight = 0;

    for (const [factor, contribution] of Object.entries(factorContributions)) {
      const weight = weights[factor as keyof FactorWeights] ?? 0;
      combinedProb += contribution * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0) {
      combinedProb /= totalWeight;
    } else {
      combinedProb = historicalProb;
    }

    // Blend with historical posterior for stability
    const blendFactor = Math.min(checkIns.length / 10, 0.7); // More data = more reliance on historical
    const finalProb = blendFactor * historicalProb + (1 - blendFactor) * combinedProb;

    // Calculate confidence interval based on data quality
    const effectiveSampleSize = this.calculateEffectiveSampleSize(checkIns, factors);
    const syntheticPosterior = this.createSyntheticPosterior(finalProb, effectiveSampleSize);
    const ci = betaCredibleInterval(syntheticPosterior.alpha, syntheticPosterior.beta);

    return {
      probability: finalProb,
      mode: finalProb, // Simplified
      confidenceInterval: ci,
      variance: betaVariance(syntheticPosterior.alpha, syntheticPosterior.beta),
      sampleSize: checkIns.length,
    };
  }

  /**
   * Calculate contributions from each factor
   */
  private calculateFactorContributions(
    factors: PredictionFactors,
    baseProb: number
  ): Record<string, number> {
    return {
      historical: factors.userHistoricalRate || baseProb,
      category: factors.categoryHistoricalRate || baseProb,
      maslowLevel: factors.maslowLevelRate || baseProb,
      frequency: factors.frequencyRate || baseProb,
      streak: this.calculateStreakContribution(factors.currentStreak, baseProb),
      recency: this.calculateRecencyContribution(factors.daysSinceLastSuccess, baseProb),
      load: this.calculateLoadContribution(factors.concurrentCommitments, baseProb),
      temporal: this.calculateTemporalContribution(factors, baseProb),
      hierarchy: this.calculateHierarchyContribution(factors, baseProb),
    };
  }

  /**
   * Streak effect: longer streaks increase probability
   */
  private calculateStreakContribution(streak: number, baseProb: number): number {
    // Streak bonus: up to 15% increase for long streaks
    const streakBonus = Math.min(streak * 0.02, 0.15);
    return Math.min(baseProb + streakBonus, 0.95);
  }

  /**
   * Recency effect: recent failures decrease probability
   */
  private calculateRecencyContribution(daysSinceSuccess: number, baseProb: number): number {
    if (daysSinceSuccess <= 1) return baseProb * 1.05;
    if (daysSinceSuccess <= 3) return baseProb;
    if (daysSinceSuccess <= 7) return baseProb * 0.95;
    return baseProb * 0.85;
  }

  /**
   * Commitment load effect: too many commitments decrease probability
   */
  private calculateLoadContribution(concurrent: number, baseProb: number): number {
    if (concurrent <= 3) return baseProb * 1.05;
    if (concurrent <= 5) return baseProb;
    if (concurrent <= 7) return baseProb * 0.90;
    return baseProb * 0.75;
  }

  /**
   * Temporal patterns: account for time-of-day and day-of-week effects
   */
  private calculateTemporalContribution(factors: PredictionFactors, baseProb: number): number {
    let modifier = 1.0;

    // Weekend effect (can be positive or negative depending on commitment type)
    if (factors.isWeekend) {
      modifier *= 0.95; // Slightly lower on weekends by default
    }

    // Morning commitment bonus (most people are more consistent in morning)
    if (factors.hourOfDay >= 6 && factors.hourOfDay <= 10) {
      modifier *= 1.05;
    }

    // Late night penalty
    if (factors.hourOfDay >= 22 || factors.hourOfDay <= 4) {
      modifier *= 0.90;
    }

    return baseProb * modifier;
  }

  /**
   * Maslow hierarchy effect: lower unsatisfied needs make higher-level commitments harder
   */
  private calculateHierarchyContribution(factors: PredictionFactors, baseProb: number): number {
    const maslowOrder: MaslowLevel[] = [
      'physiological' as MaslowLevel,
      'safety' as MaslowLevel,
      'love_belonging' as MaslowLevel,
      'esteem' as MaslowLevel,
      'self_actualization' as MaslowLevel,
    ];

    const targetIndex = maslowOrder.indexOf(factors.targetMaslowLevel);
    let penalty = 0;

    // Check if lower levels are unsatisfied
    for (let i = 0; i < targetIndex; i++) {
      const level = maslowOrder[i];
      const score = factors.maslowScores[level] ?? 50;
      if (score < 50) {
        penalty += (50 - score) * 0.002; // Small penalty for each unsatisfied lower need
      }
    }

    return Math.max(baseProb - penalty, 0.1);
  }

  /**
   * Calculate effective sample size for confidence interval
   */
  private calculateEffectiveSampleSize(
    checkIns: CommitmentCheckIn[],
    factors: PredictionFactors
  ): number {
    let effective = checkIns.length;

    // Boost effective size if we have good factor data
    if (factors.categoryHistoricalRate > 0) effective += 2;
    if (factors.maslowLevelRate > 0) effective += 2;
    if (factors.userHistoricalRate > 0) effective += 3;

    return effective;
  }

  /**
   * Create synthetic Beta parameters that match a target probability and sample size
   */
  private createSyntheticPosterior(probability: number, sampleSize: number): BetaParams {
    // Add prior to sample size
    const totalSize = sampleSize + this.config.priorAlpha + this.config.priorBeta - 2;
    const alpha = probability * totalSize + 1;
    const beta = (1 - probability) * totalSize + 1;
    return { alpha, beta };
  }

  /**
   * Suggest optimal time for a commitment based on historical patterns
   */
  suggestOptimalTiming(
    checkIns: CommitmentCheckIn[],
    frequency: CommitmentFrequency
  ): { hourOfDay: number; dayOfWeek?: number } {
    // Analyze check-ins by time
    const hourSuccessRates = new Map<number, { success: number; total: number }>();
    const daySuccessRates = new Map<number, { success: number; total: number }>();

    for (const checkIn of checkIns) {
      const date = new Date(checkIn.timestamp);
      const hour = date.getHours();
      const day = date.getDay();

      // Hour analysis
      if (!hourSuccessRates.has(hour)) {
        hourSuccessRates.set(hour, { success: 0, total: 0 });
      }
      const hourData = hourSuccessRates.get(hour)!;
      hourData.total++;
      if (checkIn.completed) hourData.success++;

      // Day analysis
      if (!daySuccessRates.has(day)) {
        daySuccessRates.set(day, { success: 0, total: 0 });
      }
      const dayData = daySuccessRates.get(day)!;
      dayData.total++;
      if (checkIn.completed) dayData.success++;
    }

    // Find best hour
    let bestHour = 9; // Default to 9 AM
    let bestHourRate = 0;
    for (const [hour, data] of hourSuccessRates) {
      if (data.total >= 3) {
        const rate = data.success / data.total;
        if (rate > bestHourRate) {
          bestHourRate = rate;
          bestHour = hour;
        }
      }
    }

    // Find best day (for weekly+ commitments)
    let bestDay: number | undefined;
    if (frequency === 'weekly' || frequency === 'monthly') {
      let bestDayRate = 0;
      for (const [day, data] of daySuccessRates) {
        if (data.total >= 2) {
          const rate = data.success / data.total;
          if (rate > bestDayRate) {
            bestDayRate = rate;
            bestDay = day;
          }
        }
      }
    }

    return { hourOfDay: bestHour, dayOfWeek: bestDay };
  }
}

/**
 * Create a default prediction engine instance
 */
export function createPredictionEngine(config?: Partial<PredictionConfig>): PredictionEngine {
  return new PredictionEngine(config);
}
