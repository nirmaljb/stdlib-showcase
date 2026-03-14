import type { BifurcationPoint, OrbitPoint } from '../engine/types';
import { clamp } from './scales';

interface PlotBox {
  xStart: number;
  xEnd: number;
  yTop: number;
  yBottom: number;
}

export interface DrawBifurcationOptions {
  width: number;
  height: number;
  points: BifurcationPoint[];
  rMin: number;
  rMax: number;
  selectedR: number;
}

export interface DrawOrbitOptions {
  width: number;
  height: number;
  points: OrbitPoint[];
}

const AXIS_LEFT = 50;
const AXIS_RIGHT = 18;
const AXIS_TOP = 18;
const AXIS_BOTTOM = 36;

const getPlotBox = (width: number, height: number): PlotBox => ({
  xStart: AXIS_LEFT,
  xEnd: width - AXIS_RIGHT,
  yTop: AXIS_TOP,
  yBottom: height - AXIS_BOTTOM
});

const drawAxes = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  xLabel: string,
  yLabel: string
): PlotBox => {
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, height);

  const box = getPlotBox(width, height);

  context.strokeStyle = '#333';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(box.xStart, box.yBottom);
  context.lineTo(box.xEnd, box.yBottom);
  context.moveTo(box.xStart, box.yBottom);
  context.lineTo(box.xStart, box.yTop);
  context.stroke();

  context.fillStyle = '#666';
  context.font = '12px "IBM Plex Sans", "Segoe UI", sans-serif';
  context.fillText(xLabel, box.xEnd - 8, box.yBottom + 20);
  context.fillText(yLabel, box.xStart - 16, box.yTop + 5);

  return box;
};

export const mapXToR = (
  pixelX: number,
  width: number,
  rMin: number,
  rMax: number
): number => {
  const box = {
    xStart: AXIS_LEFT,
    xEnd: width - AXIS_RIGHT
  };
  const plotWidth = box.xEnd - box.xStart;
  const normalized = clamp((pixelX - box.xStart) / plotWidth, 0, 1);
  return rMin + normalized * (rMax - rMin);
};

export const drawBifurcation = (
  context: CanvasRenderingContext2D,
  options: DrawBifurcationOptions
): void => {
  const { width, height, points, rMin, rMax, selectedR } = options;
  const box = drawAxes(context, width, height, 'r', 'x');

  const plotWidth = box.xEnd - box.xStart;
  const plotHeight = box.yBottom - box.yTop;
  const rSpan = rMax - rMin;

  if (rSpan <= 0) {
    return;
  }

  context.fillStyle = '#fff';

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = box.xStart + ((point.r - rMin) / rSpan) * plotWidth;
    const y = box.yBottom - clamp(point.x, 0, 1) * plotHeight;
    context.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  const clampedSelectedR = clamp(selectedR, rMin, rMax);
  const markerX = box.xStart + ((clampedSelectedR - rMin) / rSpan) * plotWidth;

  context.strokeStyle = '#fff';
  context.lineWidth = 1;
  context.setLineDash([4, 3]);
  context.beginPath();
  context.moveTo(markerX, box.yTop);
  context.lineTo(markerX, box.yBottom);
  context.stroke();
  context.setLineDash([]);

  context.fillStyle = '#fff';
  context.fillText(`r = ${clampedSelectedR.toFixed(3)}`, box.xStart + 6, box.yTop + 14);
};

export const drawOrbit = (
  context: CanvasRenderingContext2D,
  options: DrawOrbitOptions
): void => {
  const { width, height, points } = options;
  const box = drawAxes(context, width, height, 't', 'x_t');

  if (points.length === 0) {
    context.fillStyle = '#666';
    context.fillText('No orbit data available.', box.xStart + 12, box.yTop + 20);
    return;
  }

  const plotWidth = box.xEnd - box.xStart;
  const plotHeight = box.yBottom - box.yTop;
  const tMax = Math.max(points.length - 1, 1);

  context.strokeStyle = '#fff';
  context.lineWidth = 1.2;
  context.beginPath();

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = box.xStart + (point.t / tMax) * plotWidth;
    const y = box.yBottom - clamp(point.x, 0, 1) * plotHeight;

    if (i === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }

  context.stroke();

  context.fillStyle = '#888';
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const x = box.xStart + (point.t / tMax) * plotWidth;
    const y = box.yBottom - clamp(point.x, 0, 1) * plotHeight;
    context.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }
};
