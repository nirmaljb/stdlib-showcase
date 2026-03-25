import { useEffect, useRef, useState } from 'react';
import type { OrbitPoint } from '../engine/types';
import { drawOrbit } from '../render/draw';
import max from '@stdlib/math-base-special-max';
import floor from '@stdlib/math-base-special-floor';

interface OrbitCanvasProps {
  points: OrbitPoint[];
}

interface ViewportSize {
  width: number;
  height: number;
}

const MIN_WIDTH = 520;
const MIN_HEIGHT = 80;

export default function OrbitCanvas({ points }: OrbitCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<ViewportSize>({ width: 960, height: 360 });

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      const width = max(MIN_WIDTH, floor(rect.width));
      const height = max(MIN_HEIGHT, floor(rect.height));
      setSize({ width, height });
    };

    resize();

    const observer = new ResizeObserver(() => {
      resize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = floor(size.width * dpr);
    canvas.height = floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawOrbit(context, {
      width: size.width,
      height: size.height,
      points
    });
  }, [points, size.height, size.width]);

  return (
    <div className="plot-surface" ref={containerRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Logistic orbit time series"
      />
    </div>
  );
}
