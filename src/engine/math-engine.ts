import linspace from '@stdlib/array-linspace';
import abs from '@stdlib/math-base-special-abs';
import ln from '@stdlib/math-base-special-ln';
import mean from '@stdlib/stats-base-mean';
import variance from '@stdlib/stats-base-variance';
import isFinite from '@stdlib/assert-is-finite';
import max from '@stdlib/math-base-special-max';
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

    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
    }

    for (let t = 0; t < request.orbitLength; t += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
      orbitPoints.push({ t, x: orbitX });
    }

    // lyapunov: λ = (1/N) * Σ ln|f'(x_n)| where f'(x) = r * (1 - 2x)
    let lyapunovX = request.x0;
    let lyapunovSum = 0;
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

      lyapunovSum += ln(derivativeAbs);
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

    const elapsedMs = performance.now() - startedAt;

    return {
      bifurcationPoints,
      orbitPoints,
      stats: {
        mean: meanValue,
        variance: varianceValue,
        lyapunov: lyapunovValue
      },
      elapsedMs,
      requestUsed: request
    };
  }
}
