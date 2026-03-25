import linspace from '@stdlib/array-linspace';
import abs from '@stdlib/math-base-special-abs';
import ln from '@stdlib/math-base-special-ln';
import min from '@stdlib/math-base-special-min';
import max from '@stdlib/math-base-special-max';
import mean from '@stdlib/stats-base-mean';
import variance from '@stdlib/stats-base-variance';
import isFinite from '@stdlib/assert-is-finite';
import ceil from '@stdlib/math-base-special-ceil';

import type {
  BifurcationEngine,
  BifurcationPoint,
  ComputeRequest,
  ComputeResult,
  OrbitPoint
} from './types';

const MAX_STATS_POINTS = 12000;
const LYAPUNOV_ZERO_GUARD = 1e-10;

// clamp x to [0, 1]
const clamp01 = (value: number): number => {
  if (!isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

// f(x) = r * x * (1 - x)
const logisticStep = (r: number, x: number): number => r * x * (1 - x);

export class StdlibMathEngine implements BifurcationEngine {
  compute(request: ComputeRequest): ComputeResult {
    const startedAt = performance.now();

    const bifurcationPoints: BifurcationPoint[] = [];
    const orbitPoints: OrbitPoint[] = [];
    const steadyStateValues: number[] = [];

    const totalSteadyCount = request.numR * request.tailCount;
    const statsStride = max(1, ceil(totalSteadyCount / MAX_STATS_POINTS));
    let steadyValueIndex = 0;

    // bifurcation: iterate f for each r, keep last tailCount values
    const rValues = linspace(request.rMin, request.rMax, request.numR) as number[];

    for (let rIndex = 0; rIndex < rValues.length; rIndex += 1) {
      const r = rValues[rIndex];
      let x = request.x0;

      for (let i = 0; i < request.iterations; i += 1) {
        x = clamp01(logisticStep(r, x));

        if (i >= request.iterations - request.tailCount) {
          bifurcationPoints.push({ r, x });

          if (
            steadyValueIndex % statsStride === 0 &&
            steadyStateValues.length < MAX_STATS_POINTS
          ) {
            steadyStateValues.push(x);
          }

          steadyValueIndex += 1;
        }
      }
    }

    // orbit: single r, burn in then record orbitLength steps
    let orbitX = request.x0;
    let attractorMin = 1;
    let attractorMax = 0;

    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
    }

    for (let t = 0; t < request.orbitLength; t += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
      orbitPoints.push({ t, x: orbitX });

      // track attractor bounds
      attractorMin = min(attractorMin, orbitX);
      attractorMax = max(attractorMax, orbitX);
    }

    const attractorRange = attractorMax - attractorMin;

    // lyapunov: λ = (1/N) * Σ ln|f'(x_n)| where f'(x) = r * (1 - 2x)
    // Also compute variance of log-stretch factors
    let lyapunovX = request.x0;
    let lyapunovSum = 0;
    let lyapunovSumSq = 0;
    let lyapunovCount = 0;

    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      lyapunovX = clamp01(logisticStep(request.orbitR, lyapunovX));
    }

    for (let i = 0; i < request.iterations; i += 1) {
      lyapunovX = clamp01(logisticStep(request.orbitR, lyapunovX));

      // f'(x) = r * (1 - 2x)
      const derivative = request.orbitR * (1 - 2 * lyapunovX);
      const derivativeAbs = abs(derivative);

      if (derivativeAbs < LYAPUNOV_ZERO_GUARD) {
        continue;
      }

      if (!isFinite(derivativeAbs)) {
        continue;
      }

      const logStretch = ln(derivativeAbs);
      lyapunovSum += logStretch;
      lyapunovSumSq += logStretch * logStretch;
      lyapunovCount += 1;
    }

    // μ = mean(x), σ² = variance(x, correction=1)
    const meanValue =
      steadyStateValues.length > 0
        ? mean(steadyStateValues.length, steadyStateValues, 1)
        : 0;

    const varianceValue =
      steadyStateValues.length > 1
        ? variance(steadyStateValues.length, 1, steadyStateValues, 1)
        : 0;

    // λ = (1/K) * Σ ln|f'(x_n)|
    const lyapunovValue = lyapunovCount > 0 ? lyapunovSum / lyapunovCount : 0;

    // Lyapunov variance: Var(ln|f'(x)|) = E[X²] - E[X]²
    // Clamp to 0 to handle floating-point rounding when E[X²] ≈ E[X]²
    const lyapunovVarianceRaw =
      lyapunovCount > 1
        ? lyapunovSumSq / lyapunovCount - lyapunovValue * lyapunovValue
        : 0;
    const lyapunovVariance = max(0, lyapunovVarianceRaw);

    // Analytic fixed point: x* = 1 - 1/r for r > 1
    // Stability margin: |f'(x*)| = |2 - r|
    const fixedPoint = request.orbitR > 1 ? 1 - 1 / request.orbitR : null;
    const stabilityMargin = request.orbitR > 1 ? abs(2 - request.orbitR) : null;

    // Lag-1 autocorrelation: ρ₁ = Σ(xₜ - μ)(xₜ₊₁ - μ) / ((T-1) · σ²)
    // Computed from orbit points after burn-in
    let autocorrelation: number | null = null;

    if (orbitPoints.length > 1) {
      // Compute orbit mean
      let orbitSum = 0;
      for (let i = 0; i < orbitPoints.length; i += 1) {
        orbitSum += orbitPoints[i].x;
      }
      const orbitMean = orbitSum / orbitPoints.length;

      // Compute orbit variance
      let orbitVarianceSum = 0;
      for (let i = 0; i < orbitPoints.length; i += 1) {
        const diff = orbitPoints[i].x - orbitMean;
        orbitVarianceSum += diff * diff;
      }
      const orbitVariance = orbitVarianceSum / orbitPoints.length;

      // Compute lag-1 autocovariance
      if (orbitVariance > 1e-12) {
        let autocovSum = 0;
        for (let i = 0; i < orbitPoints.length - 1; i += 1) {
          const diffT = orbitPoints[i].x - orbitMean;
          const diffT1 = orbitPoints[i + 1].x - orbitMean;
          autocovSum += diffT * diffT1;
        }
        const autocovariance = autocovSum / (orbitPoints.length - 1);
        autocorrelation = autocovariance / orbitVariance;
      } else {
        // Near-zero variance means essentially constant orbit
        autocorrelation = 1;
      }
    }

    // Period detection: check if orbit has period p ∈ {1, 2, 4, 8, 16}
    // For each candidate, compute max |x_{t+p} - x_t| over tail
    const PERIOD_TOLERANCE = 1e-6;
    const candidatePeriods = [1, 2, 4, 8, 16];
    let detectedPeriod: number | null = null;

    if (orbitPoints.length >= 32) {
      // Use last half of orbit for period detection (more settled)
      const halfLen = Math.floor(orbitPoints.length / 2);
      const startIdx = orbitPoints.length - halfLen;

      for (const p of candidatePeriods) {
        if (startIdx + p >= orbitPoints.length) {
          break;
        }

        let maxDiff = 0;
        for (let i = startIdx; i < orbitPoints.length - p; i += 1) {
          const diff = abs(orbitPoints[i].x - orbitPoints[i + p].x);
          if (diff > maxDiff) {
            maxDiff = diff;
          }
        }

        if (maxDiff < PERIOD_TOLERANCE) {
          detectedPeriod = p;
          break;
        }
      }
    }

    // Shannon entropy: H = -Σ pᵢ · ln(pᵢ) over binned orbit values
    // Uses 32 bins over [0, 1]
    const NUM_ENTROPY_BINS = 32;
    let entropy: number | null = null;

    if (orbitPoints.length >= NUM_ENTROPY_BINS) {
      // Build histogram
      const binCounts = new Array<number>(NUM_ENTROPY_BINS).fill(0);

      for (let i = 0; i < orbitPoints.length; i += 1) {
        // Map x in [0, 1] to bin index in [0, NUM_ENTROPY_BINS - 1]
        const binIdx = Math.min(
          NUM_ENTROPY_BINS - 1,
          Math.floor(orbitPoints[i].x * NUM_ENTROPY_BINS)
        );
        binCounts[binIdx] += 1;
      }

      // Compute entropy: H = -Σ pᵢ · ln(pᵢ), skip pᵢ = 0
      let entropySum = 0;
      const totalCount = orbitPoints.length;

      for (let i = 0; i < NUM_ENTROPY_BINS; i += 1) {
        if (binCounts[i] > 0) {
          const p = binCounts[i] / totalCount;
          entropySum -= p * ln(p);
        }
      }

      entropy = entropySum;
    }

    const elapsedMs = performance.now() - startedAt;

    return {
      bifurcationPoints,
      orbitPoints,
      stats: {
        mean: meanValue,
        variance: varianceValue,
        lyapunov: lyapunovValue,
        lyapunovVariance,
        attractorMin,
        attractorMax,
        attractorRange,
        fixedPoint,
        stabilityMargin,
        autocorrelation,
        detectedPeriod,
        entropy
      },
      elapsedMs,
      requestUsed: request
    };
  }
}
