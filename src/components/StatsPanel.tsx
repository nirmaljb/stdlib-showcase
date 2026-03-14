import type { ComputeRequest, ComputeStats } from '../engine/types';

interface StatsPanelProps {
  stats: ComputeStats | null;
  requestUsed: ComputeRequest | null;
  bifurcationPointCount: number;
  orbitPointCount: number;
  elapsedMs: number | null;
  error: string | null;
}

const formatMetric = (value: number | null, digits = 6): string => {
  if (value === null || !Number.isFinite(value)) {
    return 'N/A';
  }

  return value.toFixed(digits);
};

const classifyLyapunov = (lambda: number | null): string => {
  if (lambda === null || !Number.isFinite(lambda)) {
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
          <dt>Variance</dt>
          <dd>{formatMetric(stats?.variance ?? null)}</dd>
        </div>
        <div>
          <dt>Lyapunov λ</dt>
          <dd>{formatMetric(stats?.lyapunov ?? null)}</dd>
        </div>
        <div>
          <dt>Regime</dt>
          <dd>{classifyLyapunov(stats?.lyapunov ?? null)}</dd>
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
