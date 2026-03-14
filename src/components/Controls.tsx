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
    <div className="controls-strip">
      <div className="control-group">
        <label htmlFor="orbit-r-slider">r</label>
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
        <span className="control-value">{orbitR.toFixed(3)}</span>
      </div>

      <div className="control-group">
        <label htmlFor="x0-slider">x0</label>
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
        <span className="control-value">{x0.toFixed(3)}</span>
      </div>

      <div className="control-group">
        <label htmlFor="precision-slider">Precision</label>
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
        <span className="control-value">{precisionLabels[precisionIndex]}</span>
      </div>

      <div className="controls-meta">
        <span>{busy ? 'Computing...' : `${numR.toLocaleString()} samples`}</span>
        <button type="button" className="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
