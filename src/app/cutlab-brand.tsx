import type { CSSProperties } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandStyleProps = {
  className?: string;
  style?: CSSProperties;
  /**
   * Temporary compatibility for the legacy tracker call sites that still pass
   * plain CSS through MUI's `sx` prop.
   */
  sx?: CSSProperties;
};

export function CutLabMark({
  size = 36,
  className,
  style,
  sx,
}: { size?: number } & BrandStyleProps) {
  return (
    <span
      className={cn("relative block shrink-0", className)}
      style={{ width: size, height: size, ...sx, ...style }}
    >
      <img
        src="/brand/favicon.png"
        alt="Relay"
        className="brand-logo-light absolute inset-0 block size-full object-contain"
      />
      <img
        src="/brand/app-icon-dark.svg"
        alt=""
        aria-hidden="true"
        className="brand-logo-dark absolute inset-0 block size-full object-contain"
      />
    </span>
  );
}

export function CutLabLockup({
  compact = false,
  subtitle,
  className,
  style,
  sx,
}: {
  compact?: boolean;
  subtitle?: string;
} & BrandStyleProps) {
  return (
    <Link
      href="/"
      aria-label="Go to dashboard"
      className={cn("flex w-fit flex-col items-start gap-1 text-inherit no-underline", className)}
      style={{ ...sx, ...style }}
    >
      <span
        className={cn(
          "flex items-baseline gap-1.5 font-[family-name:var(--font-geist-sans)] font-bold leading-none tracking-[-0.055em]",
          compact ? "min-h-8 text-[26px]" : "min-h-10 text-[34px]",
        )}
      >
        <span className="text-[var(--app-ink)]">Frame</span>
        <span className="text-[var(--app-accent)]">Desk</span>
      </span>
      {subtitle ? (
        <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--app-muted)]">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
