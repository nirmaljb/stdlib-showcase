interface ControlsProps {
  isOpen: boolean;
  busy: boolean;
  orbitR: number;
  x0: number;
  precisionIndex: number;
  precisionLabels: string[];
  numR: number;
  onOpen: () => void;
  onClose: () => void;
  onOrbitRChange: (value: number) => void;
  onX0Change: (value: number) => void;
  onPrecisionChange: (value: number) => void;
  onReset: () => void;
}

export default function Controls({
  isOpen,
  busy,
  orbitR,
  x0,
  precisionIndex,
  precisionLabels,
  numR,
  onOpen,
  onClose,
  onOrbitRChange,
  onX0Change,
  onPrecisionChange,
  onReset
}: ControlsProps): JSX.Element {
  return (
    <>
      <button type="button" className="button controls-trigger" onClick={onOpen}>
        Controls
      </button>

      {isOpen ? (
        <div className="modal-overlay" onClick={onClose}>
          <section
            className="modal-panel"
            aria-label="Controls"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="modal-header">
              <h2>Control Panel</h2>
              <button type="button" className="button" onClick={onClose}>
                Close
              </button>
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

            <div className="meta-row">
              <span>numR samples</span>
              <span>{numR.toLocaleString()}</span>
            </div>

            <div className="control-footer">
              <button type="button" className="button" onClick={onReset}>
                Reset
              </button>
              <span className="status" aria-live="polite">
                {busy ? 'Computing...' : 'Idle'}
              </span>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
