import linspace from '@stdlib/array-linspace';
import mean from '@stdlib/stats-base-mean';
import variance from '@stdlib/stats-base-variance';
import isFinite from '@stdlib/assert-is-finite';

import type {
  BifurcationEngine,
  BifurcationPoint,
  ComputeRequest,
  ComputeResult,
  OrbitPoint
} from './types';

const MAX_STATS_POINTS = 50000;

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

const logisticStep = (r: number, x: number): number => r * x * (1 - x);

const meanFallback = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < values.length; i += 1) {
    total += values[i];
  }

  return total / values.length;
};

const varianceFallback = (values: number[], meanValue: number): number => {
  if (values.length < 2) {
    return 0;
  }

  let total = 0;
  for (let i = 0; i < values.length; i += 1) {
    const delta = values[i] - meanValue;
    total += delta * delta;
  }

  return total / values.length;
};

export class StdlibMathEngine implements BifurcationEngine {
  compute(request: ComputeRequest): ComputeResult {
    const startedAt = performance.now();

    const bifurcationPoints: BifurcationPoint[] = [];
    const orbitPoints: OrbitPoint[] = [];
    const steadyStateValues: number[] = [];
    const totalSteadyCount = request.numR * request.tailCount;
    const statsStride = Math.max(1, Math.floor(totalSteadyCount / MAX_STATS_POINTS));
    let steadyValueIndex = 0;

    // EDIT HERE: adjust r sampling strategy (currently uniform linspace over [rMin, rMax]).
    const rValues = linspace(request.rMin, request.rMax, request.numR) as number[];

    for (let rIndex = 0; rIndex < rValues.length; rIndex += 1) {
      const r = rValues[rIndex];
      let x = request.x0;

      // EDIT HERE: replace the update rule if you want to experiment with other maps.
      for (let i = 0; i < request.iterations; i += 1) {
        x = clamp01(logisticStep(r, x));

        if (i >= request.iterations - request.tailCount) {
          bifurcationPoints.push({ r, x });

          // Keep all points for plotting, but cap stats input size to prevent stack overflows.
          if (steadyValueIndex % statsStride === 0) {
            steadyStateValues.push(x);
          }

          steadyValueIndex += 1;
        }
      }
    }

    let orbitX = request.x0;

    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
    }

    for (let t = 0; t < request.orbitLength; t += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
      orbitPoints.push({ t, x: orbitX });
    }

    // EDIT HERE: plug in additional stdlib metrics (entropy, quantiles, etc.).
    let meanValue = 0;
    let varianceValue = 0;

    try {
      meanValue = steadyStateValues.length > 0 ? mean(steadyStateValues) : 0;
      varianceValue = steadyStateValues.length > 1 ? variance(steadyStateValues) : 0;
    } catch (_error) {
      // Fallback keeps the app responsive if a runtime/library edge case occurs.
      meanValue = meanFallback(steadyStateValues);
      varianceValue = varianceFallback(steadyStateValues, meanValue);
    }

    const elapsedMs = performance.now() - startedAt;

    return {
      bifurcationPoints,
      orbitPoints,
      stats: {
        mean: meanValue,
        variance: varianceValue
      },
      elapsedMs,
      requestUsed: request
    };
  }
}
