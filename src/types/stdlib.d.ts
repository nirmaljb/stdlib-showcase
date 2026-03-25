declare module '@stdlib/array-linspace' {
  export default function linspace(start: number, stop: number, num: number): number[];
}

declare module '@stdlib/stats-base-mean' {
  export default function mean(
    N: number,
    x: ArrayLike<number>,
    stride: number
  ): number;
}

declare module '@stdlib/stats-base-variance' {
  export default function variance(
    N: number,
    correction: number,
    x: ArrayLike<number>,
    stride: number
  ): number;
}

declare module '@stdlib/math-base-special-ln' {
  export default function ln(value: number): number;
}

declare module '@stdlib/math-base-special-abs' {
  export default function abs(value: number): number;
}

declare module '@stdlib/math-base-special-min' {
  export default function min(x: number, y: number): number;
}

declare module '@stdlib/math-base-special-max' {
  export default function max(x: number, y: number): number;
}

declare module '@stdlib/assert-is-finite' {
  export default function isFinite(value: number): boolean;
}

declare module '@stdlib/math-base-special-ceil' {
  export default function ceil(x: number): number;
}
