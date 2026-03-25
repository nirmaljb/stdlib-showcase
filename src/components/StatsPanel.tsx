import type { ComputeRequest, ComputeStats } from '../engine/types';
import isFinite from '@stdlib/assert-is-finite';

interface StatsPanelProps {
  stats: ComputeStats | null;
  requestUsed: ComputeRequest | null;
  bifurcationPointCount: number;
  orbitPointCount: number;
  elapsedMs: number | null;
  error: string | null;
}

const formatMetric = (value: number | null, digits = 6): string => {
  if (value === null || !isFinite(value)) {
    return 'N/A';
  }

  return value.toFixed(digits);
};

const classifyLyapunov = (lambda: number | null): string => {
  if (lambda === null || !isFinite(lambda)) {
    return 'N/A';
  }

  if (lambda > 0.01) {
    return 'Chaotic';
  }

  if (lambda < -0.01) {
    return 'Stable';
  }

  return 'Boundary';
};

const formatPeriod = (period: number | null): string => {
  if (period === null) {
    return 'Aperiodic';
  }
  return period.toString();
};

export default function StatsPanel({
  stats,
  requestUsed,
  bifurcationPointCount,
  orbitPointCount,
  elapsedMs,
  error
}: StatsPanelProps): JSX.Element {
  return (
    <section className="panel stats-panel" aria-label="Statistics">
      <h2>Statistics</h2>

      <dl className="metrics">
        <div>
          <dt>Mean</dt>
          <dd>{formatMetric(stats?.mean ?? null)}</dd>
        </div>
        <div>
          <dt>Fixed Point x*</dt>
          <dd>{formatMetric(stats?.fixedPoint ?? null)}</dd>
        </div>
        <div>
          <dt>Stability Margin</dt>
          <dd>{formatMetric(stats?.stabilityMargin ?? null)}</dd>
        </div>
        <div>
          <dt>Variance</dt>
          <dd>{formatMetric(stats?.variance ?? null)}</dd>
        </div>
        <div>
          <dt>Lyapunov λ</dt>
          <dd>{formatMetric(stats?.lyapunov ?? null)}</dd>
        </div>
        <div>
          <dt>Lyapunov Var</dt>
          <dd>{formatMetric(stats?.lyapunovVariance ?? null)}</dd>
        </div>
        <div>
          <dt>Regime</dt>
          <dd>{classifyLyapunov(stats?.lyapunov ?? null)}</dd>
        </div>
        <div>
          <dt>Detected Period</dt>
          <dd>{formatPeriod(stats?.detectedPeriod ?? null)}</dd>
        </div>
        <div>
          <dt>Attractor Range</dt>
          <dd>{formatMetric(stats?.attractorRange ?? null)}</dd>
        </div>
        <div>
          <dt>Attractor Min</dt>
          <dd>{formatMetric(stats?.attractorMin ?? null)}</dd>
        </div>
        <div>
          <dt>Attractor Max</dt>
          <dd>{formatMetric(stats?.attractorMax ?? null)}</dd>
        </div>
        <div>
          <dt>Autocorrelation</dt>
          <dd>{formatMetric(stats?.autocorrelation ?? null)}</dd>
        </div>
        <div>
          <dt>Entropy (nats)</dt>
          <dd>{formatMetric(stats?.entropy ?? null, 4)}</dd>
        </div>
        <div>
          <dt>Bifurcation points</dt>
          <dd>{bifurcationPointCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Orbit points</dt>
          <dd>{orbitPointCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>N / m</dt>
          <dd>
            {requestUsed
              ? `${requestUsed.iterations} / ${requestUsed.tailCount}`
              : 'N/A'}
          </dd>
        </div>
        <div>
          <dt>Compute time</dt>
          <dd>{elapsedMs !== null ? `${elapsedMs.toFixed(2)} ms` : 'N/A'}</dd>
        </div>
      </dl>

      {error ? <p className="error-banner">{error}</p> : null}
    </section>
  );
}
