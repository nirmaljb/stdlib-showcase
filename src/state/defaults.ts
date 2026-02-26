import type { ComputeRequest } from '../engine/types';

export const BIFURCATION_R_MIN = 2.5;
export const BIFURCATION_R_MAX = 4.0;

export const ORBIT_R_MIN = 0;
export const ORBIT_R_MAX = 4;

export const X0_MIN = 0;
export const X0_MAX = 1;

export const ORBIT_BURN_IN_DEFAULT = 100;
export const ORBIT_LENGTH_DEFAULT = 200;
export const NUM_R_DEFAULT = 1200;

export const COMPUTE_DEBOUNCE_MS = 200;

export interface PrecisionPreset {
  key: 'low' | 'medium' | 'high';
  label: string;
  iterations: number;
  tailCount: number;
}

export const PRECISION_PRESETS: PrecisionPreset[] = [
  {
    key: 'low',
    label: 'Low',
    iterations: 400,
    tailCount: 80
  },
  {
    key: 'medium',
    label: 'Medium',
    iterations: 1000,
    tailCount: 200
  },
  {
    key: 'high',
    label: 'High',
    iterations: 2000,
    tailCount: 400
  }
];

export const DEFAULT_PRECISION_INDEX = 1;

export const DEFAULT_REQUEST: ComputeRequest = {
  rMin: BIFURCATION_R_MIN,
  rMax: BIFURCATION_R_MAX,
  numR: NUM_R_DEFAULT,
  iterations: PRECISION_PRESETS[DEFAULT_PRECISION_INDEX].iterations,
  tailCount: PRECISION_PRESETS[DEFAULT_PRECISION_INDEX].tailCount,
  orbitBurnIn: ORBIT_BURN_IN_DEFAULT,
  orbitLength: ORBIT_LENGTH_DEFAULT,
  orbitR: 3.7,
  x0: 0.5
};
