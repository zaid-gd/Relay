"use client";

import { useEffect, useRef } from "react";

interface NoiseProps {
  patternSize?: number;
  patternScaleX?: number;
  patternScaleY?: number;
  patternRefreshInterval?: number;
  patternAlpha?: number;
}

export default function Noise({
  patternSize = 250,
  patternScaleX = 1,
  patternScaleY = 1,
  patternRefreshInterval = 2,
  patternAlpha = 15,
}: NoiseProps) {
  const grainRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = grainRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const canvasSize = Math.max(1024, patternSize);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const imageData = context.createImageData(canvasSize, canvasSize);
    let frame = 0;
    let animationId = 0;
    let isPaused =
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const drawGrain = () => {
      const data = imageData.data;
      for (let index = 0; index < data.length; index += 4) {
        const value = Math.random() * 255;
        data[index] = value;
        data[index + 1] = value;
        data[index + 2] = value;
        data[index + 3] = patternAlpha;
      }
      context.putImageData(imageData, 0, 0);
    };

    const loop = () => {
      if (isPaused) {
        animationId = 0;
        return;
      }
      if (!isPaused && frame % Math.max(1, patternRefreshInterval) === 0)
        drawGrain();
      frame += 1;
      animationId = window.requestAnimationFrame(loop);
    };

    const resume = () => {
      isPaused =
        document.hidden ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!isPaused && !animationId) loop();
    };

    loop();
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.cancelAnimationFrame(animationId);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [patternAlpha, patternRefreshInterval, patternSize]);

  return (
    <canvas
      ref={grainRef}
      className="noise-overlay"
      style={{
        imageRendering: "pixelated",
        transform: `scale(${patternScaleX}, ${patternScaleY})`,
      }}
    />
  );
}
