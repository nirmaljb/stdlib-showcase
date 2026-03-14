// =============================================================================
// MATHEMATICAL ENGINE — Logistic Map Explorer
// =============================================================================
//
// This file implements all numerical computation for the bifurcation diagram,
// orbit time series, and statistical metrics (mean, variance, Lyapunov exponent).
//
// CORE CONCEPT: The Logistic Map
// ──────────────────────────────
// The logistic map is a simple recurrence relation that models population
// dynamics. Despite its simplicity, it exhibits the full range of behaviour
// from stable fixed points, through period-doubling cascades, to chaos.
//
//   x_{n+1} = r · x_n · (1 - x_n)
//
// where:
//   x_n  ∈ [0, 1]  — normalised population at time-step n
//   r    ∈ [0, 4]  — growth / control parameter
//
// References:
//   • May, R. M. (1976). "Simple mathematical models with very complicated dynamics."
//     Nature, 261, 459–467. https://doi.org/10.1038/261459a0
//   • Wikipedia — Logistic map: https://en.wikipedia.org/wiki/Logistic_map
//   • Strogatz, S. H. (1994). Nonlinear Dynamics and Chaos, ch. 10.
// =============================================================================

import linspace from '@stdlib/array-linspace';
import abs from '@stdlib/math-base-special-abs';
import ln from '@stdlib/math-base-special-ln';
import mean from '@stdlib/stats-base-mean';
import variance from '@stdlib/stats-base-variance';

import type {
  BifurcationEngine,
  BifurcationPoint,
  ComputeRequest,
  ComputeResult,
  OrbitPoint
} from './types';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

// Maximum number of steady-state x-values fed into mean/variance.
// The bifurcation scan can produce numR × tailCount points (e.g. 1200 × 400 =
// 480 000). Passing a half-million-element array to stdlib's strided stats
// functions in one call can overflow the call stack, so we stride-sample down
// to at most MAX_STATS_POINTS values before computing statistics.
const MAX_STATS_POINTS = 12000;

// The Lyapunov term involves ln|r·(1 - 2·x)|. When the absolute derivative
// approaches zero the logarithm diverges to -∞, which would collapse the
// running average. Any sample whose |derivative| falls below this guard is
// skipped. 1e-10 is well below any numerically meaningful value.
const LYAPUNOV_ZERO_GUARD = 1e-10;

// -----------------------------------------------------------------------------
// Helper: clamp01
// -----------------------------------------------------------------------------
// Keeps x strictly inside [0, 1] after each logistic step.
//
// WHY: Floating-point arithmetic can produce values like 1.0000000000000002
// or -2.3e-17 at the boundaries of the unit interval. A subsequent step with
// x slightly outside [0,1] would push the orbit off to ±∞ and corrupt
// every downstream metric. Clamping prevents that blow-up.
const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) {
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

// -----------------------------------------------------------------------------
// Helper: logisticStep
// -----------------------------------------------------------------------------
// Applies one iteration of the logistic map:
//
//   f(x) = r · x · (1 - x)
//
// This is the discrete-time analogue of the continuous logistic equation
// dN/dt = rN(1 - N/K). Setting K = 1 (carrying capacity normalised to 1)
// and discretising gives exactly this form.
//
// Key properties:
//   • f maps [0,1] → [0, r/4]. For r ≤ 4 the image is contained in [0,1].
//   • f has a unique interior fixed point at x* = 1 - 1/r  (for r > 1).
//   • The slope at the fixed point is f'(x*) = 2 - r. Stability requires
//     |f'(x*)| < 1, i.e. 1 < r < 3.
//
// References:
//   • https://en.wikipedia.org/wiki/Logistic_map#Behavior_dependent_on_r
const logisticStep = (r: number, x: number): number => r * x * (1 - x);

// =============================================================================
// StdlibMathEngine
// =============================================================================
export class StdlibMathEngine implements BifurcationEngine {
  compute(request: ComputeRequest): ComputeResult {
    const startedAt = performance.now();

    const bifurcationPoints: BifurcationPoint[] = [];
    const orbitPoints: OrbitPoint[] = [];

    // Holds a stride-sampled subset of steady-state x values used for mean
    // and variance. Kept separate from bifurcationPoints so the plot is never
    // thinned, only the stats input is.
    const steadyStateValues: number[] = [];

    // ── Stride calculation ────────────────────────────────────────────────────
    // Total steady-state samples across all r values:
    //   totalSteadyCount = numR × tailCount
    // e.g. 1200 r-values × 400 tail samples = 480 000 points.
    //
    // To keep the stats array bounded we take every statsStride-th point.
    // Using ceil ensures the stride is never zero and the array never exceeds
    // MAX_STATS_POINTS.
    const totalSteadyCount = request.numR * request.tailCount;
    const statsStride = Math.max(1, Math.ceil(totalSteadyCount / MAX_STATS_POINTS));
    let steadyValueIndex = 0;

    // =========================================================================
    // SECTION 1 — BIFURCATION DIAGRAM
    // =========================================================================
    //
    // CONCEPT:
    // For each value of r we iterate the logistic map starting from x0, discard
    // the first (iterations - tailCount) steps as transient "burn-in", and
    // record the remaining tailCount values of x. Plotting all (r, x) pairs
    // produces the bifurcation diagram.
    //
    // WHY DISCARD THE TRANSIENT?
    // Starting from an arbitrary x0 the orbit has not yet settled onto its
    // attractor. The initial steps reflect the choice of x0, not the long-run
    // dynamics of r. Discarding them (the "burn-in" or "warm-up") lets the
    // trajectory converge to the attractor before we sample.
    //
    // WHAT YOU SEE:
    //   r < 3.0   → single dot per r (stable fixed point)
    //   r ≈ 3.0   → period-2 bifurcation; two dots appear
    //   r ≈ 3.45  → period-4 (second bifurcation)
    //   r ≈ 3.54  → period-8, then 16, 32 ... (Feigenbaum cascade)
    //   r ≈ 3.57  → onset of chaos (Feigenbaum point)
    //   r > 3.57  → chaotic bands with periodic windows (e.g. period-3 at r≈3.83)
    //   r = 4.0   → fully developed chaos; orbit is dense on [0,1]
    //
    // FEIGENBAUM CONSTANT:
    // The ratio of successive bifurcation intervals converges to:
    //   δ = lim (r_{n} - r_{n-1}) / (r_{n+1} - r_{n}) ≈ 4.6692...
    // This constant is universal across a wide class of 1-D unimodal maps.
    //   Reference: https://en.wikipedia.org/wiki/Feigenbaum_constants
    //
    // EDIT HERE: adjust r sampling strategy (currently uniform linspace over [rMin, rMax]).
    const rValues = linspace(request.rMin, request.rMax, request.numR) as number[];

    for (let rIndex = 0; rIndex < rValues.length; rIndex += 1) {
      const r = rValues[rIndex];

      // Reset to the same initial condition for every r so all columns are
      // comparable. Using a fixed x0 means the transient length is consistent.
      let x = request.x0;

      // EDIT HERE: replace the update rule if you want to experiment with other maps.
      for (let i = 0; i < request.iterations; i += 1) {
        // Apply one logistic step, clamping the result to [0,1].
        x = clamp01(logisticStep(r, x));

        // Only record the last `tailCount` iterations — the steady-state tail.
        // Condition: i >= (iterations - tailCount), i.e. we are in the tail.
        if (i >= request.iterations - request.tailCount) {
          bifurcationPoints.push({ r, x });

          // Stride-sample into steadyStateValues so the mean/variance arrays
          // stay within MAX_STATS_POINTS regardless of precision preset.
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

    // =========================================================================
    // SECTION 2 — ORBIT / TIME SERIES
    // =========================================================================
    //
    // CONCEPT:
    // For a single selected r value (orbitR) we record x_t vs t — the trajectory
    // of the system through time. This lets you watch the orbit directly:
    //   • Stable fixed point   → flat horizontal line converging to x*
    //   • Period-2 cycle       → alternating between two values
    //   • Period-4 cycle       → cycling through four values
    //   • Chaos                → irregular, never exactly repeating
    //
    // BURN-IN (orbitBurnIn):
    // Same idea as the bifurcation burn-in: we advance the state orbitBurnIn
    // steps before recording, so the displayed orbit starts on (or near) the
    // attractor rather than showing the initial transient.
    //
    // Reference: https://en.wikipedia.org/wiki/Logistic_map#Orbits

    let orbitX = request.x0;

    // Discard the transient (burn-in phase — not recorded).
    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
    }

    // Record orbitLength steps on the attractor.
    for (let t = 0; t < request.orbitLength; t += 1) {
      orbitX = clamp01(logisticStep(request.orbitR, orbitX));
      orbitPoints.push({ t, x: orbitX });
    }

    // =========================================================================
    // SECTION 3 — LYAPUNOV EXPONENT
    // =========================================================================
    //
    // CONCEPT:
    // The Lyapunov exponent λ measures the average exponential rate at which
    // two nearby trajectories diverge (or converge) over time.
    //
    //   λ > 0  →  neighbouring orbits diverge exponentially → CHAOS
    //   λ < 0  →  neighbouring orbits converge → STABLE attractor
    //   λ = 0  →  boundary between order and chaos (bifurcation point)
    //
    // FORMULA:
    // For a 1-D map f, the Lyapunov exponent starting from x_0 is:
    //
    //   λ = lim_{N→∞} (1/N) · Σ_{n=0}^{N-1} ln |f'(x_n)|
    //
    // For the logistic map f(x) = r·x·(1-x):
    //
    //   f'(x) = r · (1 - 2x)           ← derivative with respect to x
    //
    // so each term becomes:
    //
    //   ln |r · (1 - 2·x_n)|
    //
    // We accumulate this sum over `iterations` post-burn-in steps and divide
    // by the count of valid (finite, non-zero) terms to get the average.
    //
    // INTUITION:
    // |f'(x)| > 1 at a point means the map is locally stretching — nearby
    // points are being pushed apart. |f'(x)| < 1 means local contraction.
    // The Lyapunov exponent is the long-run geometric mean of this stretching
    // factor, expressed in log-scale.
    //
    // KNOWN VALUES for the logistic map:
    //   r = 2.0  → λ ≈ -0.693  (stable period-1)
    //   r = 3.2  → λ ≈ -0.465  (stable period-2)
    //   r = 3.57 → λ ≈  0      (Feigenbaum point, onset of chaos)
    //   r = 3.9  → λ ≈ +0.48   (chaotic)
    //   r = 4.0  → λ = ln(2) ≈ +0.693  (fully chaotic, analytic result)
    //
    // References:
    //   • Wikipedia — Lyapunov exponent: https://en.wikipedia.org/wiki/Lyapunov_exponent
    //   • Wikipedia — Logistic map, Lyapunov section:
    //       https://en.wikipedia.org/wiki/Logistic_map#Lyapunov_exponents
    //   • Sprott, J. C. (2003). Chaos and Time-Series Analysis, ch. 5.
    //       http://sprott.physics.wisc.edu/chaos/lyapunov.htm

    // Start a fresh trajectory from x0 using orbitR.
    let lyapunovX = request.x0;
    let lyapunovSum = 0;   // running sum of ln|f'(x_n)|
    let lyapunovCount = 0; // number of valid terms included in the sum

    // Burn-in: advance past the transient so we sample on the attractor.
    // (Uses the same orbitBurnIn as the orbit section for consistency.)
    for (let i = 0; i < request.orbitBurnIn; i += 1) {
      lyapunovX = clamp01(logisticStep(request.orbitR, lyapunovX));
    }

    // Accumulate ln|f'(x_n)| over `iterations` post-burn-in steps.
    // We use `iterations` (not `tailCount`) to maximise statistical accuracy —
    // more terms → better convergence of the average.
    for (let i = 0; i < request.iterations; i += 1) {
      lyapunovX = clamp01(logisticStep(request.orbitR, lyapunovX));

      // Derivative of the logistic map at the current point:
      //   f'(x) = r · (1 - 2x)
      const derivative = request.orbitR * (1 - 2 * lyapunovX);

      // Take the absolute value — Lyapunov exponent uses |f'(x)|.
      const derivativeAbs = abs(derivative);

      // Guard 1: skip if the derivative is effectively zero.
      // This happens at the map's maximum (x = 0.5), where f'(0.5) = 0 and
      // ln(0) = -∞. Skipping keeps the average well-defined.
      if (derivativeAbs < LYAPUNOV_ZERO_GUARD) {
        continue;
      }

      // Guard 2: skip any non-finite result (should not occur after clamp01,
      // but defensive against edge-case floating-point surprises).
      if (!isFinite(derivativeAbs)) {
        continue;
      }

      // Add ln|f'(x_n)| to the running total.
      lyapunovSum += ln(derivativeAbs);
      lyapunovCount += 1;
    }

    // =========================================================================
    // SECTION 4 — SUMMARY STATISTICS
    // =========================================================================
    //
    // Mean (μ):
    //   The arithmetic average of the steady-state x values sampled across all
    //   r values in the bifurcation scan.
    //
    //   μ = (1/N) · Σ x_i
    //
    //   For a stable fixed point μ ≈ x*. For fully chaotic r=4, the
    //   invariant density is ρ(x) = 1/(π√(x(1-x))), giving μ = 0.5.
    //
    //   stdlib API: mean(N, array, stride)
    //   Reference: https://github.com/stdlib-js/stats-base-mean
    //
    // Variance (σ²):
    //   Measures how spread out the steady-state x values are.
    //
    //   σ² = (1/(N-1)) · Σ (x_i - μ)²      ← Bessel-corrected (correction=1)
    //
    //   Low variance → orbit concentrates near a fixed point or small cycle.
    //   High variance → orbit explores a wide range of x (chaotic).
    //
    //   stdlib API: variance(N, correction, array, stride)
    //   Reference: https://github.com/stdlib-js/stats-base-variance
    //
    // EDIT HERE: plug in additional stdlib metrics (entropy, quantiles, etc.).

    const meanValue =
      steadyStateValues.length > 0
        ? mean(steadyStateValues.length, steadyStateValues, 1)
        : 0;

    const varianceValue =
      steadyStateValues.length > 1
        ? variance(steadyStateValues.length, 1, steadyStateValues, 1)
        : 0;

    // Final Lyapunov estimate: divide accumulated sum by number of valid terms.
    //   λ ≈ (1/K) · Σ ln|f'(x_n)|
    // Falls back to 0 if no valid terms were collected (degenerate input).
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
