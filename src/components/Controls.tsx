interface ControlsProps {
  busy: boolean;
  orbitR: number;
  x0: number;
  precisionIndex: number;
  precisionLabels: string[];
  numR: number;
  onOrbitRChange: (value: number) => void;
  onX0Change: (value: number) => void;
  onPrecisionChange: (value: number) => void;
  onReset: () => void;
}

export default function Controls({
  busy,
  orbitR,
  x0,
  precisionIndex,
  precisionLabels,
  numR,
  onOrbitRChange,
  onX0Change,
  onPrecisionChange,
  onReset
}: ControlsProps): JSX.Element {
  return (
    <section className="controls-section">
      <div className="controls-header">
        <h2>Controls</h2>
        <span className="status" aria-live="polite">
          {busy ? 'Computing...' : 'Idle'}
        </span>
      </div>

      <label htmlFor="orbit-r-slider" className="control-label">
        Orbit r
        <span>{orbitR.toFixed(3)}</span>
      </label>
      <input
        id="orbit-r-slider"
        className="slider"
        type="range"
        min={0}
        max={4}
        step={0.001}
        value={orbitR}
        onChange={(event) => {
          onOrbitRChange(Number(event.currentTarget.value));
        }}
      />

      <label htmlFor="x0-slider" className="control-label">
        Initial x0
        <span>{x0.toFixed(3)}</span>
      </label>
      <input
        id="x0-slider"
        className="slider"
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={x0}
        onChange={(event) => {
          onX0Change(Number(event.currentTarget.value));
        }}
      />

      <label htmlFor="precision-slider" className="control-label">
        Precision
        <span>{precisionLabels[precisionIndex]}</span>
      </label>
      <input
        id="precision-slider"
        className="slider"
        type="range"
        min={0}
        max={precisionLabels.length - 1}
        step={1}
        value={precisionIndex}
        onChange={(event) => {
          onPrecisionChange(Number(event.currentTarget.value));
        }}
      />

      <div className="controls-footer">
        <div className="meta-row">
          <span>numR samples</span>
          <span>{numR.toLocaleString()}</span>
        </div>
        <button type="button" className="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </section>
  );
}
