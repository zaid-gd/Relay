"use client";

import { useEffect, useRef } from "react";

type Falloff = "linear" | "smooth" | "sharp";

export interface CursorGridProps {
  cellSize?: number;
  color?: string;
  radius?: number;
  falloff?: Falloff;
  holdTime?: number;
  fadeDuration?: number;
  lineWidth?: number;
  maxOpacity?: number;
  fillOpacity?: number;
  gridOpacity?: number;
  cellRadius?: number;
  clickPulse?: boolean;
  pulseSpeed?: number;
  className?: string;
}

interface GridConfig {
  cellSize: number;
  color: string;
  radius: number;
  falloff: Falloff;
  holdTime: number;
  fadeDuration: number;
  lineWidth: number;
  maxOpacity: number;
  fillOpacity: number;
  gridOpacity: number;
  cellRadius: number;
  clickPulse: boolean;
  pulseSpeed: number;
}

interface Pulse {
  x: number;
  y: number;
  t0: number;
}

const FALLOFF_CURVES: Record<Falloff, (t: number) => number> = {
  linear: (t) => t,
  smooth: (t) => t * t * (3 - 2 * t),
  sharp: (t) => t * t * t,
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const value =
    h.length === 3
      ? h
          .split("")
          .map((character) => character + character)
          .join("")
      : h;
  const number = Number.parseInt(value.slice(0, 6), 16);
  return [(number >> 16) & 255, (number >> 8) & 255, number & 255];
}

export default function CursorGrid({
  cellSize = 70,
  color = "#b6ff46",
  radius = 140,
  falloff = "smooth",
  holdTime = 400,
  fadeDuration = 800,
  lineWidth = 1.2,
  maxOpacity = 1,
  fillOpacity = 0,
  gridOpacity = 0,
  cellRadius = 0,
  clickPulse = true,
  pulseSpeed = 600,
  className = "",
}: CursorGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef<GridConfig>({
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
  });
  const wakeRef = useRef<(() => void) | null>(null);

  propsRef.current = {
    cellSize,
    color,
    radius,
    falloff,
    holdTime,
    fadeDuration,
    lineWidth,
    maxOpacity,
    fillOpacity,
    gridOpacity,
    cellRadius,
    clickPulse,
    pulseSpeed,
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    let columns = 0;
    let rows = 0;
    let offsetX = 0;
    let offsetY = 0;
    let alphas = new Float32Array(0);
    let touched = new Float64Array(0);
    let width = 0;
    let height = 0;
    const pulses: Pulse[] = [];
    let frame = 0;
    let running = false;
    let lastFrame = 0;

    const rebuild = () => {
      const config = propsRef.current;
      width = container.offsetWidth;
      height = container.offsetHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.ceil(width / config.cellSize) + 1;
      rows = Math.ceil(height / config.cellSize) + 1;
      offsetX = (width - columns * config.cellSize) / 2;
      offsetY = (height - rows * config.cellSize) / 2;
      alphas = new Float32Array(columns * rows);
      touched = new Float64Array(columns * rows);
    };

    const cellCenter = (index: number): [number, number] => {
      const config = propsRef.current;
      const x =
        offsetX + (index % columns) * config.cellSize + config.cellSize / 2;
      const y =
        offsetY +
        Math.floor(index / columns) * config.cellSize +
        config.cellSize / 2;
      return [x, y];
    };

    const energize = (x: number, y: number, boost = 1) => {
      const config = propsRef.current;
      const radiusValue = Math.max(config.radius, 1);
      const ease = FALLOFF_CURVES[config.falloff];
      const now = performance.now();
      const minColumn = Math.max(
        0,
        Math.floor((x - radiusValue - offsetX) / config.cellSize)
      );
      const maxColumn = Math.min(
        columns - 1,
        Math.floor((x + radiusValue - offsetX) / config.cellSize)
      );
      const minRow = Math.max(
        0,
        Math.floor((y - radiusValue - offsetY) / config.cellSize)
      );
      const maxRow = Math.min(
        rows - 1,
        Math.floor((y + radiusValue - offsetY) / config.cellSize)
      );

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let column = minColumn; column <= maxColumn; column += 1) {
          const index = row * columns + column;
          const [centerX, centerY] = cellCenter(index);
          const distance = Math.hypot(centerX - x, centerY - y);
          if (distance > radiusValue) continue;

          const level =
            ease(1 - distance / radiusValue) * config.maxOpacity * boost;
          if (level > alphas[index]) alphas[index] = level;
          if (level > 0) touched[index] = now;
        }
      }
    };

    const draw = (now: number) => {
      const config = propsRef.current;
      const delta = Math.min(now - lastFrame, 50);
      lastFrame = now;
      context.clearRect(0, 0, width, height);
      const [red, green, blue] = hexToRgb(config.color);

      if (config.gridOpacity > 0) {
        context.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${config.gridOpacity})`;
        context.lineWidth = 1;
        context.beginPath();
        for (let column = 0; column <= columns; column += 1) {
          const x = Math.round(offsetX + column * config.cellSize) + 0.5;
          context.moveTo(x, 0);
          context.lineTo(x, height);
        }
        for (let row = 0; row <= rows; row += 1) {
          const y = Math.round(offsetY + row * config.cellSize) + 0.5;
          context.moveTo(0, y);
          context.lineTo(width, y);
        }
        context.stroke();
      }

      for (
        let pulseIndex = pulses.length - 1;
        pulseIndex >= 0;
        pulseIndex -= 1
      ) {
        const pulse = pulses[pulseIndex];
        const age = (now - pulse.t0) / 1000;
        const ringRadius = age * config.pulseSpeed;
        if (ringRadius > Math.hypot(width, height)) {
          pulses.splice(pulseIndex, 1);
          continue;
        }

        const band = config.cellSize;
        const minColumn = Math.max(
          0,
          Math.floor((pulse.x - ringRadius - band - offsetX) / config.cellSize)
        );
        const maxColumn = Math.min(
          columns - 1,
          Math.floor((pulse.x + ringRadius + band - offsetX) / config.cellSize)
        );
        const minRow = Math.max(
          0,
          Math.floor((pulse.y - ringRadius - band - offsetY) / config.cellSize)
        );
        const maxRow = Math.min(
          rows - 1,
          Math.floor((pulse.y + ringRadius + band - offsetY) / config.cellSize)
        );

        for (let row = minRow; row <= maxRow; row += 1) {
          for (let column = minColumn; column <= maxColumn; column += 1) {
            const index = row * columns + column;
            const [centerX, centerY] = cellCenter(index);
            const distance = Math.hypot(centerX - pulse.x, centerY - pulse.y);
            if (
              Math.abs(distance - ringRadius) < band / 2 &&
              config.maxOpacity > alphas[index]
            ) {
              alphas[index] = config.maxOpacity;
              touched[index] = now;
            }
          }
        }
      }

      let anyVisible = pulses.length > 0;
      const fadeStep = delta / Math.max(config.fadeDuration, 16);
      const half = config.cellSize / 2;

      for (let index = 0; index < alphas.length; index += 1) {
        let alpha = alphas[index];
        if (alpha <= 0) continue;
        if (now - touched[index] > config.holdTime) {
          alpha = Math.max(0, alpha - fadeStep);
          alphas[index] = alpha;
          if (alpha <= 0) continue;
        }
        anyVisible = true;

        const [centerX, centerY] = cellCenter(index);
        const gradient = context.createRadialGradient(
          centerX,
          centerY,
          half * 0.1,
          centerX,
          centerY,
          config.cellSize
        );
        gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${alpha})`);
        gradient.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);

        context.beginPath();
        const x = centerX - half + 0.5;
        const y = centerY - half + 0.5;
        const size = config.cellSize - 1;
        if (config.cellRadius > 0)
          context.roundRect(x, y, size, size, config.cellRadius);
        else context.rect(x, y, size, size);
        if (config.fillOpacity > 0) {
          context.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * config.fillOpacity})`;
          context.fill();
        }
        context.strokeStyle = gradient;
        context.lineWidth = config.lineWidth;
        context.stroke();
      }

      if (anyVisible && !reduceMotion) frame = requestAnimationFrame(draw);
      else running = false;
    };

    const wake = () => {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      frame = requestAnimationFrame(draw);
    };
    wakeRef.current = wake;

    const toLocal = (event: PointerEvent): [number, number] => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };

    const onPointerMove = (event: PointerEvent) => {
      const [x, y] = toLocal(event);
      if (x < 0 || x > width || y < 0 || y > height) return;
      energize(x, y);
      wake();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!propsRef.current.clickPulse) return;
      const [x, y] = toLocal(event);
      if (x < 0 || x > width || y < 0 || y > height) return;
      pulses.push({ x, y, t0: performance.now() });
      wake();
    };

    const observer = new ResizeObserver(() => {
      rebuild();
      wake();
    });
    observer.observe(container);
    rebuild();
    wake();

    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerdown", onPointerDown);
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      wakeRef.current = null;
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [cellSize]);

  useEffect(() => {
    wakeRef.current?.();
  }, [gridOpacity, color, lineWidth, maxOpacity, fillOpacity, cellRadius]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden${className ? ` ${className}` : ""}`}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        aria-hidden="true"
      />
    </div>
  );
}
