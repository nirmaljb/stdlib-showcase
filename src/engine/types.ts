export interface ComputeRequest {
  rMin: number;
  rMax: number;
  numR: number;
  iterations: number;
  tailCount: number;
  orbitBurnIn: number;
  orbitLength: number;
  orbitR: number;
  x0: number;
}

export interface BifurcationPoint {
  r: number;
  x: number;
}

export interface OrbitPoint {
  t: number;
  x: number;
}

export interface ComputeStats {
  mean: number;
  variance: number;
  lyapunov: number;
  lyapunovVariance: number;
  attractorMin: number;
  attractorMax: number;
  attractorRange: number;
  fixedPoint: number | null;
  stabilityMargin: number | null;
  autocorrelation: number | null;
  detectedPeriod: number | null;
  entropy: number | null;
}

export interface ComputeResult {
  bifurcationPoints: BifurcationPoint[];
  orbitPoints: OrbitPoint[];
  stats: ComputeStats;
  elapsedMs: number;
  requestUsed: ComputeRequest;
}

export interface BifurcationEngine {
  compute(request: ComputeRequest): ComputeResult;
}
