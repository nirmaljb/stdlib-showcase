# from-order-to-chaos

Logistic map bifurcation diagram and orbit explorer.

Engine code is in `src/engine/math-engine.ts`.

## The map

```
x_{n+1} = r * x_n * (1 - x_n)
```

- `x` lives in `[0, 1]`
- `r` lives in `[0, 4]`
- Bifurcation scan range: `r ∈ [2.5, 4.0]`

## Controls

| Parameter | Range | Default |
|-----------|-------|---------|
| r (orbit) | 0 – 4 | 3.7 |
| x0 | 0 – 1 | 0.5 |
| Precision | Low / Med / High | Med |

Precision presets set iterations (N) and tail samples (m):
- Low: N=400, m=80
- Medium: N=1000, m=200
- High: N=2000, m=400

Other fixed values: 1200 r-samples, 100 orbit burn-in steps, 200 orbit length.

## Metrics

- **Mean** — `μ = (1/N) Σ x_i`
- **Variance** — `σ² = (1/(N-1)) Σ (x_i - μ)²`
- **Lyapunov exponent** — `λ = (1/K) Σ ln|r(1 - 2x_n)|`
  - `λ > 0` → chaotic, `λ < 0` → stable

## stdlib

All math runs through these:

- `@stdlib/array-linspace` — uniform r grid
- `@stdlib/stats-base-mean` — strided mean
- `@stdlib/stats-base-variance`
- `@stdlib/math-base-special-ln` — natural log 
- `@stdlib/math-base-special-abs` — absolute value
- `@stdlib/math-base-special-ceil` - ceil
- `@stdlib/math-base-special-floor` - floor of number
- `@stdlib/math-base-special-max` - max among multiple numbers
- `@stdlib/math-base-special-min` - min among multiple numbers
- `@stdlib/math-base-special-round` - Round a numeric value to the nearest integer.
- `@stdlib/assert-is-finite` - check if a number if finite or not
- `@stdlib/math-base-assert-is-integer` - check if a number is an integer or not
