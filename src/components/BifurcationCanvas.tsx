import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { BifurcationPoint } from '../engine/types';
import { drawBifurcation, mapXToR } from '../render/draw';

interface BifurcationCanvasProps {
  points: BifurcationPoint[];
  rMin: number;
  rMax: number;
  selectedR: number;
  onSelectR: (value: number) => void;
}

interface ViewportSize {
  width: number;
  height: number;
}

const MIN_WIDTH = 520;
const MIN_HEIGHT = 80;

export default function BifurcationCanvas({
  points,
  rMin,
  rMax,
  selectedR,
  onSelectR
}: BifurcationCanvasProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<ViewportSize>({ width: 960, height: 560 });

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const resize = (): void => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(MIN_WIDTH, Math.floor(rect.width));
      const height = Math.max(MIN_HEIGHT, Math.floor(rect.height));
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
    canvas.width = Math.floor(size.width * dpr);
    canvas.height = Math.floor(size.height * dpr);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBifurcation(context, {
      width: size.width,
      height: size.height,
      points,
      rMin,
      rMax,
      selectedR
    });
  }, [points, rMin, rMax, selectedR, size.height, size.width]);

  const handleClick = (event: MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const nextR = mapXToR(x, rect.width, rMin, rMax);
    onSelectR(nextR);
  };

  return (
    <div className="plot-surface" ref={containerRef}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Bifurcation diagram"
        onClick={handleClick}
      />
    </div>
  );
}
