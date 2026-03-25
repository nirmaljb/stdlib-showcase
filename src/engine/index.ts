import { StdlibMathEngine } from './math-engine';
import type {
  BifurcationEngine,
  BifurcationPoint,
  ComputeRequest,
  ComputeResult,
  OrbitPoint
} from './types';

import isFinite from '@stdlib/assert-is-finite';
import round from '@stdlib/math-base-special-round';
import max from '@stdlib/math-base-special-max';
import min from '@stdlib/math-base-special-min';
import isInteger from '@stdlib/math-base-assert-is-integer';

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

const finiteOrFallback = (value: number, fallback: number): number => {
  if (!isFinite(value)) {
    return fallback;
  }

  return value;
};

const sanitizeInteger = (value: number, min: number, fallback: number): number => {
  const finite = finiteOrFallback(value, fallback);
  const rounded = round(finite);
  return max(min, rounded);
};

export const sanitizeComputeRequest = (
  request: ComputeRequest,
  defaults: ComputeRequest
): ComputeRequest => {
  const rMinRaw = clamp(
    finiteOrFallback(request.rMin, defaults.rMin),
    0,
    4
  );

  const rMaxRaw = clamp(
    finiteOrFallback(request.rMax, defaults.rMax),
    0,
    4
  );

  const rMin = min(rMinRaw, rMaxRaw);
  const rMax = max(rMinRaw, rMaxRaw);

  const iterations = sanitizeInteger(
    request.iterations,
    2,
    defaults.iterations
  );

  const tailCountCandidate = sanitizeInteger(
    request.tailCount,
    1,
    defaults.tailCount
  );

  const tailCount = min(tailCountCandidate, iterations - 1);

  return {
    rMin,
    rMax,
    numR: sanitizeInteger(request.numR, 2, defaults.numR),
    iterations,
    tailCount,
    orbitBurnIn: sanitizeInteger(
      request.orbitBurnIn,
      0,
      defaults.orbitBurnIn
    ),
    orbitLength: sanitizeInteger(
      request.orbitLength,
      1,
      defaults.orbitLength
    ),
    orbitR: clamp(finiteOrFallback(request.orbitR, defaults.orbitR), 0, 4),
    x0: clamp(finiteOrFallback(request.x0, defaults.x0), 0, 1)
  };
};

const validateBifurcationPoint = (
  point: BifurcationPoint,
  request: ComputeRequest,
  index: number
): void => {
  if (!isFinite(point.r) || !isFinite(point.x)) {
    throw new Error(`Bifurcation point ${index} has non-finite values.`);
  }

  if (point.r < request.rMin || point.r > request.rMax) {
    throw new Error(`Bifurcation point ${index} has r outside request range.`);
  }

  if (point.x < 0 || point.x > 1) {
    throw new Error(`Bifurcation point ${index} has x outside [0,1].`);
  }
};

const validateOrbitPoint = (point: OrbitPoint, index: number): void => {
  if (!isFinite(point.t) || !isFinite(point.x)) {
    throw new Error(`Orbit point ${index} has non-finite values.`);
  }

  if (point.t < 0) {
    throw new Error(`Orbit point ${index} has negative time index.`);
  }

  if (point.x < 0 || point.x > 1) {
    throw new Error(`Orbit point ${index} has x outside [0,1].`);
  }
};

export const validateComputeResult = (
  result: ComputeResult,
  request: ComputeRequest
): void => {
  if (!Array.isArray(result.bifurcationPoints)) {
    throw new Error('bifurcationPoints must be an array.');
  }

  if (!Array.isArray(result.orbitPoints)) {
    throw new Error('orbitPoints must be an array.');
  }

  result.bifurcationPoints.forEach((point, index) => {
    validateBifurcationPoint(point, request, index);
  });

  result.orbitPoints.forEach((point, index) => {
    validateOrbitPoint(point, index);
  });

  if (
    !isFinite(result.stats.mean) ||
    !isFinite(result.stats.variance) ||
    !isFinite(result.stats.lyapunov) ||
    !isFinite(result.stats.lyapunovVariance) ||
    !isFinite(result.stats.attractorMin) ||
    !isFinite(result.stats.attractorMax) ||
    !isFinite(result.stats.attractorRange)
  ) {
    throw new Error('stats must contain finite values for all metrics.');
  }

  if (result.stats.variance < 0) {
    throw new Error('variance must be non-negative.');
  }

  if (result.stats.lyapunovVariance < 0) {
    throw new Error('lyapunovVariance must be non-negative.');
  }

  if (result.stats.attractorRange < 0) {
    throw new Error('attractorRange must be non-negative.');
  }

  if (
    result.stats.attractorMin < 0 ||
    result.stats.attractorMin > 1 ||
    result.stats.attractorMax < 0 ||
    result.stats.attractorMax > 1
  ) {
    throw new Error('attractorMin and attractorMax must be in [0,1].');
  }

  // fixedPoint and stabilityMargin can be null (for r <= 1)
  if (
    result.stats.fixedPoint !== null &&
    !isFinite(result.stats.fixedPoint)
  ) {
    throw new Error('fixedPoint must be finite when defined.');
  }

  if (
    result.stats.stabilityMargin !== null &&
    (!isFinite(result.stats.stabilityMargin) ||
      result.stats.stabilityMargin < 0)
  ) {
    throw new Error('stabilityMargin must be finite and non-negative when defined.');
  }

  // autocorrelation can be null (insufficient data) or in [-1, 1]
  if (
    result.stats.autocorrelation !== null &&
    !isFinite(result.stats.autocorrelation)
  ) {
    throw new Error('autocorrelation must be finite when defined.');
  }

  // detectedPeriod can be null (aperiodic) or a positive integer
  if (
    result.stats.detectedPeriod !== null &&
    (!isFinite(result.stats.detectedPeriod) ||
      result.stats.detectedPeriod < 1 ||
      !isInteger(result.stats.detectedPeriod))
  ) {
    throw new Error('detectedPeriod must be a positive integer when defined.');
  }

  // entropy can be null (insufficient data) or non-negative
  if (
    result.stats.entropy !== null &&
    (!isFinite(result.stats.entropy) || result.stats.entropy < 0)
  ) {
    throw new Error('entropy must be finite and non-negative when defined.');
  }

  if (!isFinite(result.elapsedMs) || result.elapsedMs < 0) {
    throw new Error('elapsedMs must be finite and >= 0.');
  }
};

export const createEngine = (): BifurcationEngine => new StdlibMathEngine();

export const runCompute = (
  engine: BifurcationEngine,
  request: ComputeRequest,
  defaults: ComputeRequest
): ComputeResult => {
  const sanitizedRequest = sanitizeComputeRequest(request, defaults);
  const result = engine.compute(sanitizedRequest);
  validateComputeResult(result, sanitizedRequest);
  return {
    ...result,
    requestUsed: sanitizedRequest
  };
};
