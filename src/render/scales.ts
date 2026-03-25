import isFinite from "@stdlib/assert-is-finite";

export interface LinearScaleConfig {
  domainMin: number;
  domainMax: number;
  rangeMin: number;
  rangeMax: number;
}

export const clamp = (value: number, min: number, max: number): number => {
  if (!isFinite(value)) {
    return min;
  }

  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

export const scaleLinear = (value: number, config: LinearScaleConfig): number => {
  const domainSpan = config.domainMax - config.domainMin;

  if (domainSpan === 0) {
    return config.rangeMin;
  }

  const normalized = (value - config.domainMin) / domainSpan;
  return config.rangeMin + normalized * (config.rangeMax - config.rangeMin);
};
