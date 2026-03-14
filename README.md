# From Order to Chaos: Logistic Map Explorer

Desktop-first React + TypeScript app that visualizes:

- Bifurcation diagram (x-axis `r`, y-axis `x`)
- Orbit time series (x-axis `t`, y-axis `x_t`)

Both are computed from the logistic map:

`x_{t+1} = r * x_t * (1 - x_t)`

## MVP choices implemented

- Bifurcation range: `r in [2.5, 4.0]`
- Orbit range clamp: `r_orbit in [0, 4]`
- Initial condition clamp: `x0 in [0, 1]`
- Precision presets:
  - Low: `N=400, m=80`
  - Medium: `N=1000, m=200`
  - High: `N=2000, m=400`
- `m < N` enforced
- `numR = 1200`
- Orbit burn-in: `100`
- Orbit length: `T = 200`
- Debounced live recompute: `200ms`
- Canvas 2D rendering for both plots
- Modal controls (transparent overlay)
- Stats panel uses stdlib mean + variance + Lyapunov exponent

## stdlib usage

- `@stdlib/array-linspace`
- `@stdlib/stats-base-mean`
- `@stdlib/stats-base-variance`
- `@stdlib/math-base-special-ln`
- `@stdlib/math-base-special-abs`

Math implementation lives in:

- `src/engine/math-engine.ts`

Look for `EDIT HERE` comments to customize behavior.

## Commands

```bash
npm install
npm run dev
npm run build
```

## Notes

- Full system runbook and error handling details are in `agent.md`.
