/**
 * Beta Distribution for Bayesian Inference
 *
 * The Beta distribution is the conjugate prior for binomial likelihood,
 * making it perfect for modeling success/failure outcomes.
 */

/**
 * Parameters for a Beta distribution
 * alpha = prior successes + 1
 * beta = prior failures + 1
 */
export interface BetaParams {
  alpha: number;
  beta: number;
}

/**
 * Result of a Bayesian prediction
 */
export interface PredictionResult {
  probability: number; // Point estimate (mean)
  mode: number; // Most likely value
  confidenceInterval: [number, number]; // 95% credible interval
  variance: number;
  sampleSize: number;
}

/**
 * Beta function using log-gamma for numerical stability
 */
function logGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];

  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }

  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function gamma(z: number): number {
  return Math.exp(logGamma(z));
}

function betaFunction(a: number, b: number): number {
  return Math.exp(logGamma(a) + logGamma(b) - logGamma(a + b));
}

/**
 * Beta distribution PDF
 */
export function betaPdf(x: number, alpha: number, beta: number): number {
  if (x < 0 || x > 1) return 0;
  if (x === 0) return alpha === 1 ? 1 : alpha < 1 ? Infinity : 0;
  if (x === 1) return beta === 1 ? 1 : beta < 1 ? Infinity : 0;

  const B = betaFunction(alpha, beta);
  return (Math.pow(x, alpha - 1) * Math.pow(1 - x, beta - 1)) / B;
}

/**
 * Beta distribution CDF using regularized incomplete beta function
 */
export function betaCdf(x: number, alpha: number, beta: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  // Use continued fraction expansion for the incomplete beta function
  return regularizedIncompleteBeta(x, alpha, beta);
}

/**
 * Regularized incomplete beta function
 * Using Lentz's algorithm for continued fraction
 */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  const maxIterations = 200;
  const epsilon = 1e-10;

  // Use the symmetry property for better convergence
  if (x > (a + 1) / (a + b + 2)) {
    return 1 - regularizedIncompleteBeta(1 - x, b, a);
  }

  const lnBeta = logGamma(a) + logGamma(b) - logGamma(a + b);
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lnBeta) / a;

  let f = 1;
  let c = 1;
  let d = 0;

  for (let m = 0; m <= maxIterations; m++) {
    const m2 = 2 * m;

    // Even step
    let numerator: number;
    if (m === 0) {
      numerator = 1;
    } else {
      numerator = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    }

    d = 1 + numerator * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;

    c = 1 + numerator / c;
    if (Math.abs(c) < epsilon) c = epsilon;

    f *= c * d;

    // Odd step
    numerator = -((a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));

    d = 1 + numerator * d;
    if (Math.abs(d) < epsilon) d = epsilon;
    d = 1 / d;

    c = 1 + numerator / c;
    if (Math.abs(c) < epsilon) c = epsilon;

    const delta = c * d;
    f *= delta;

    if (Math.abs(delta - 1) < epsilon) {
      return front * (f - 1);
    }
  }

  return front * (f - 1);
}

/**
 * Beta distribution quantile (inverse CDF)
 * Uses Newton-Raphson method
 */
export function betaQuantile(p: number, alpha: number, beta: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;

  // Initial guess using approximation
  let x = 0.5;
  const maxIterations = 100;
  const epsilon = 1e-10;

  for (let i = 0; i < maxIterations; i++) {
    const fx = betaCdf(x, alpha, beta) - p;
    if (Math.abs(fx) < epsilon) break;

    const fpx = betaPdf(x, alpha, beta);
    if (fpx === 0) break;

    x = x - fx / fpx;
    x = Math.max(0.0001, Math.min(0.9999, x)); // Keep in valid range
  }

  return x;
}

/**
 * Calculate mean of Beta distribution
 */
export function betaMean(alpha: number, beta: number): number {
  return alpha / (alpha + beta);
}

/**
 * Calculate mode of Beta distribution
 */
export function betaMode(alpha: number, beta: number): number {
  if (alpha <= 1 && beta <= 1) {
    // Bimodal or uniform - return mean as fallback
    return betaMean(alpha, beta);
  }
  if (alpha <= 1) return 0;
  if (beta <= 1) return 1;
  return (alpha - 1) / (alpha + beta - 2);
}

/**
 * Calculate variance of Beta distribution
 */
export function betaVariance(alpha: number, beta: number): number {
  const sum = alpha + beta;
  return (alpha * beta) / (sum * sum * (sum + 1));
}

/**
 * Calculate credible interval for Beta distribution
 */
export function betaCredibleInterval(
  alpha: number,
  beta: number,
  confidence: number = 0.95
): [number, number] {
  const lower = (1 - confidence) / 2;
  const upper = 1 - lower;
  return [betaQuantile(lower, alpha, beta), betaQuantile(upper, alpha, beta)];
}

/**
 * Update Beta distribution with new observation (Bayesian update)
 */
export function updateBeta(params: BetaParams, success: boolean): BetaParams {
  return {
    alpha: params.alpha + (success ? 1 : 0),
    beta: params.beta + (success ? 0 : 1),
  };
}

/**
 * Create prediction result from Beta parameters
 */
export function createPrediction(params: BetaParams): PredictionResult {
  const sampleSize = params.alpha + params.beta - 2; // Subtract priors
  return {
    probability: betaMean(params.alpha, params.beta),
    mode: betaMode(params.alpha, params.beta),
    confidenceInterval: betaCredibleInterval(params.alpha, params.beta),
    variance: betaVariance(params.alpha, params.beta),
    sampleSize: Math.max(0, sampleSize),
  };
}
