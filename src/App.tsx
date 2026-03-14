import { useCallback, useEffect, useMemo, useState } from 'react';
import BifurcationCanvas from './components/BifurcationCanvas';
import Controls from './components/Controls';
import OrbitCanvas from './components/OrbitCanvas';
import StatsPanel from './components/StatsPanel';
import { createEngine, runCompute } from './engine';
import type {
  BifurcationEngine,
  ComputeRequest,
  ComputeResult
} from './engine/types';
import {
  BIFURCATION_R_MAX,
  BIFURCATION_R_MIN,
  COMPUTE_DEBOUNCE_MS,
  DEFAULT_PRECISION_INDEX,
  DEFAULT_REQUEST,
  NUM_R_DEFAULT,
  ORBIT_BURN_IN_DEFAULT,
  ORBIT_LENGTH_DEFAULT,
  ORBIT_R_MAX,
  ORBIT_R_MIN,
  PRECISION_PRESETS,
  X0_MAX,
  X0_MIN
} from './state/defaults';
import { debounce } from './utils/debounce';

interface AppProps {
  engine?: BifurcationEngine;
}

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) {
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

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected compute error.';
};

export default function App({ engine: externalEngine }: AppProps): JSX.Element {
  const engine = useMemo(
    () => externalEngine ?? createEngine(),
    [externalEngine]
  );

  const [orbitR, setOrbitR] = useState<number>(DEFAULT_REQUEST.orbitR);
  const [x0, setX0] = useState<number>(DEFAULT_REQUEST.x0);
  const [precisionIndex, setPrecisionIndex] = useState<number>(
    DEFAULT_PRECISION_INDEX
  );

  const [result, setResult] = useState<ComputeResult | null>(null);
  const [isComputing, setIsComputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const request = useMemo<ComputeRequest>(() => {
    const preset = PRECISION_PRESETS[precisionIndex] ?? PRECISION_PRESETS[1];

    return {
      rMin: BIFURCATION_R_MIN,
      rMax: BIFURCATION_R_MAX,
      numR: NUM_R_DEFAULT,
      iterations: preset.iterations,
      tailCount: preset.tailCount,
      orbitBurnIn: ORBIT_BURN_IN_DEFAULT,
      orbitLength: ORBIT_LENGTH_DEFAULT,
      orbitR: clamp(orbitR, ORBIT_R_MIN, ORBIT_R_MAX),
      x0: clamp(x0, X0_MIN, X0_MAX)
    };
  }, [orbitR, precisionIndex, x0]);

  const compute = useCallback(
    (nextRequest: ComputeRequest): void => {
      setIsComputing(true);

      try {
        const nextResult = runCompute(engine, nextRequest, DEFAULT_REQUEST);
        setResult(nextResult);
        setError(null);
      } catch (computeError) {
        setError(toErrorMessage(computeError));
      } finally {
        setIsComputing(false);
      }
    },
    [engine]
  );

  const debouncedCompute = useMemo(
    () => debounce(compute, COMPUTE_DEBOUNCE_MS),
    [compute]
  );

  useEffect(() => {
    debouncedCompute(request);

    return () => {
      debouncedCompute.cancel();
    };
  }, [debouncedCompute, request]);

  const handleReset = (): void => {
    setOrbitR(DEFAULT_REQUEST.orbitR);
    setX0(DEFAULT_REQUEST.x0);
    setPrecisionIndex(DEFAULT_PRECISION_INDEX);
  };

  return (
    <div className="app-shell">
      <header className="chrome-bar">
        <div className="title-group">
          <h1>From Order to Chaos</h1>
          <p>
            Logistic map bifurcation and orbit explorer with stdlib-backed
            statistics.
          </p>
        </div>
      </header>

      <Controls
        busy={isComputing}
        orbitR={request.orbitR}
        x0={request.x0}
        precisionIndex={precisionIndex}
        precisionLabels={PRECISION_PRESETS.map((preset) => preset.label)}
        numR={request.numR}
        onOrbitRChange={(value) => {
          setOrbitR(clamp(value, ORBIT_R_MIN, ORBIT_R_MAX));
        }}
        onX0Change={(value) => {
          setX0(clamp(value, X0_MIN, X0_MAX));
        }}
        onPrecisionChange={(value) => {
          const clamped = clamp(value, 0, PRECISION_PRESETS.length - 1);
          setPrecisionIndex(Math.round(clamped));
        }}
        onReset={handleReset}
      />

      <div className="main-layout">
        <div className="left-column">
          <section className="plot-frame orbit-frame">
            <div className="plot-title">Orbit Plot (t, x_t)</div>
            <OrbitCanvas points={result?.orbitPoints ?? []} />
          </section>

          <section className="plot-frame bifurcation-frame">
            <div className="plot-title">Bifurcation Diagram (r, x)</div>
            <BifurcationCanvas
              points={result?.bifurcationPoints ?? []}
              rMin={request.rMin}
              rMax={request.rMax}
              selectedR={request.orbitR}
              onSelectR={(nextR) => {
                setOrbitR(clamp(nextR, ORBIT_R_MIN, ORBIT_R_MAX));
              }}
            />
          </section>
        </div>

        <aside className="right-column">
          <StatsPanel
            stats={result?.stats ?? null}
            requestUsed={result?.requestUsed ?? null}
            bifurcationPointCount={result?.bifurcationPoints.length ?? 0}
            orbitPointCount={result?.orbitPoints.length ?? 0}
            elapsedMs={result?.elapsedMs ?? null}
            error={error}
          />
        </aside>
      </div>
    </div>
  );
}
