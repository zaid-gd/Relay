"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";

interface SpecularButtonBaseProps {
  children: ReactNode;
  className?: string;
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
}

type SpecularButtonProps = SpecularButtonBaseProps &
  (
    | { href: string; type?: never; disabled?: never }
    | {
        href?: never;
        type?: "button" | "submit" | "reset";
        disabled?: boolean;
      }
  );

interface ShaderProps {
  radius: number;
  lineColor: string;
  baseColor: string;
  intensity: number;
  shineSize: number;
  shineFade: number;
  thickness: number;
  speed: number;
  followMouse: boolean;
  proximity: number;
  autoAnimate: boolean;
}

interface SpecularStyle extends CSSProperties {
  "--sb-radius": string;
  "--sb-tint": string;
  "--sb-tint-opacity": number;
  "--sb-text-color": string;
}

const PAD = 20;

const vertexShader = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;
  float d = sdRoundedRect(p, uHalfSize, uRadius);
  vec2 light = vec2(cos(uAngle), sin(uAngle));
  float base = (1.0 - smoothstep(0.0, uBaseWidth, abs(d))) * 0.45;
  vec2 normal = normalize(p / (uHalfSize * uHalfSize) + 1e-6);
  float phi = acos(clamp(abs(dot(normal, light)), 0.0, 1.0));
  float rim = 1.0 - smoothstep(uShineSize - uShineFade, uShineSize + uShineFade + 1e-4, phi);
  float line = gaussianLine(d, uThickness);
  float edge = 1.0 - smoothstep(0.5 * uPx, 3.0 * uPx, abs(d));
  float highlight = line * rim * edge * uIntensity;
  vec3 color = uBaseColor * base + uLineColor * highlight;
  fragColor = vec4(color, clamp(base + highlight, 0.0, 1.0));
}`;

export default function SpecularButton(props: SpecularButtonProps) {
  const router = useRouter();
  const {
    children,
    className = "",
    radius = 10,
    tint = "#11140a",
    tintOpacity = 1,
    textColor = "#ffffff",
    lineColor = "#ffffff",
    baseColor = "#c6ff00",
    intensity = 1.45,
    shineSize = 12,
    shineFade = 44,
    thickness = 1.35,
    speed = 0.24,
    followMouse = true,
    proximity = 220,
    autoAnimate = false,
  } = props;
  const buttonRef = useRef<HTMLElement | null>(null);
  const effectRef = useRef<HTMLSpanElement>(null);
  const shaderProps = useRef<ShaderProps>({
    radius,
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate,
  });

  shaderProps.current = {
    radius,
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate,
  };

  useEffect(() => {
    const button = buttonRef.current;
    const effect = effectRef.current;
    if (!button || !effect) return;

    const dpr = window.devicePixelRatio || 1;
    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr,
    });
    const gl = renderer.gl;
    let contextLost = false;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
    };
    gl.canvas.addEventListener("webglcontextlost", handleContextLost, false);
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uCenter: { value: [0, 0] },
        uHalfSize: { value: [1, 1] },
        uRadius: { value: 0 },
        uAngle: { value: 2.4 },
        uPx: { value: dpr },
        uLineColor: { value: [1, 1, 1] },
        uBaseColor: { value: [0.49, 0.63, 0] },
        uIntensity: { value: 1 },
        uShineSize: { value: 0.17 },
        uShineFade: { value: 0.7 },
        uThickness: { value: 1 },
        uBaseWidth: { value: dpr },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });
    effect.appendChild(gl.canvas);

    const size = { width: 1, height: 1 };
    let rect = button.getBoundingClientRect();
    const resize = () => {
      rect = button.getBoundingClientRect();
      size.width = rect.width;
      size.height = rect.height;
      renderer.setSize(rect.width + PAD * 2, rect.height + PAD * 2);
      program.uniforms.uCenter.value = [
        (PAD + rect.width / 2) * dpr,
        (PAD + rect.height / 2) * dpr,
      ];
      program.uniforms.uHalfSize.value = [
        (rect.width / 2) * dpr,
        (rect.height / 2) * dpr,
      ];
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(button);
    resize();

    let pointerAngle: number | null = null;
    let proximityAmount = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = Math.max(
        rect.left - event.clientX,
        0,
        event.clientX - rect.right
      );
      const deltaY = Math.max(
        rect.top - event.clientY,
        0,
        event.clientY - rect.bottom
      );
      const distance = Math.hypot(deltaX, deltaY);

      if (distance === 0) {
        const x = (event.clientX - centerX) / (rect.width / 2);
        const y = (centerY - event.clientY) / (rect.height / 2);
        pointerAngle =
          Math.atan2(2 / rect.height, -2 / rect.width) + x * 0.3 + y * 0.15;
      } else {
        pointerAngle = Math.atan2(
          centerY - event.clientY,
          event.clientX - centerX
        );
      }

      const amount = Math.max(
        0,
        1 - distance / Math.max(shaderProps.current.proximity, 1)
      );
      proximityAmount = amount * amount * (3 - 2 * amount);
      if (frame === null) frame = requestAnimationFrame(update);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("scroll", resize, { passive: true });

    const lineColorValue = new Color();
    const baseColorValue = new Color();
    let angle = 2.4;
    let idleAngle = 2.4;
    let brightness = 0;
    let previousTime = performance.now();
    let frame: number | null = null;

    const update = (now: number) => {
      frame = null;
      if (contextLost) return;
      const delta = Math.min((now - previousTime) / 1000, 0.05);
      previousTime = now;
      const current = shaderProps.current;
      idleAngle += current.speed * delta;
      const target =
        current.followMouse &&
        pointerAngle !== null &&
        (!current.autoAnimate || proximityAmount > 0)
          ? pointerAngle
          : idleAngle;
      const difference =
        ((target - angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      angle += difference * (1 - Math.exp(-delta * 7));
      const brightnessTarget = current.autoAnimate ? 1 : proximityAmount;
      brightness +=
        (brightnessTarget - brightness) * (1 - Math.exp(-delta * 8));

      lineColorValue.set(current.lineColor);
      baseColorValue.set(current.baseColor);
      program.uniforms.uAngle.value = angle;
      program.uniforms.uRadius.value =
        Math.min(current.radius, Math.min(size.width, size.height) / 2) * dpr;
      program.uniforms.uLineColor.value = [
        lineColorValue.r,
        lineColorValue.g,
        lineColorValue.b,
      ];
      program.uniforms.uBaseColor.value = [
        baseColorValue.r,
        baseColorValue.g,
        baseColorValue.b,
      ];
      program.uniforms.uIntensity.value = current.intensity * brightness;
      program.uniforms.uShineSize.value = (current.shineSize * Math.PI) / 180;
      program.uniforms.uShineFade.value = (current.shineFade * Math.PI) / 180;
      program.uniforms.uThickness.value = current.thickness * dpr;
      renderer.render({ scene: mesh });

      if (
        current.autoAnimate ||
        brightness > 0.001 ||
        (current.autoAnimate && Math.abs(difference) > 0.001)
      ) {
        frame = requestAnimationFrame(update);
      }
    };
    frame = requestAnimationFrame(update);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("scroll", resize);
      gl.canvas.removeEventListener("webglcontextlost", handleContextLost);
      if (gl.canvas.parentNode === effect) effect.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const style: SpecularStyle = {
    "--sb-radius": `${radius}px`,
    "--sb-tint": tint,
    "--sb-tint-opacity": tintOpacity,
    "--sb-text-color": textColor,
  };

  const content = (
    <>
      <span
        ref={effectRef}
        className="specular-button__fx"
        aria-hidden="true"
      />
      <span className="specular-button__label">{children}</span>
    </>
  );

  const elementClassName = `specular-button${className ? ` ${className}` : ""}`;
  if (props.href !== undefined) {
    return (
      <a
        ref={(element) => {
          buttonRef.current = element;
        }}
        href={props.href}
        onClick={(event) => {
          if (
            props.href?.startsWith("/") &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey
          ) {
            event.preventDefault();
            router.push(props.href);
          }
        }}
        className={elementClassName}
        style={style}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={(element) => {
        buttonRef.current = element;
      }}
      type={props.type ?? "button"}
      disabled={props.disabled}
      className={elementClassName}
      style={style}
    >
      {content}
    </button>
  );
}
