import type { CSSProperties } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

const brandAssets = {
  lockup: {
    light: "/brand/relay/lockup-black.svg",
    dark: "/brand/relay/lockup-white.svg",
    dimensions: { width: 320, height: 100 },
  },
  mark: {
    light: "/brand/relay/mark-black.svg",
    dark: "/brand/relay/mark-white.svg",
    dimensions: { width: 100, height: 100 },
  },
} as const;

type RelayBrandProps = {
  variant?: keyof typeof brandAssets;
  compact?: boolean;
  subtitle?: string;
  className?: string;
  style?: CSSProperties;
};

export function RelayBrand({
  variant = "lockup",
  compact = false,
  subtitle,
  className,
  style,
}: RelayBrandProps) {
  const asset = brandAssets[variant];

  return (
    <Link
      href="/"
      aria-label="Go to Relay dashboard"
      className={cn(
        "flex w-fit flex-col items-start gap-1 rounded-md text-inherit no-underline outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-canvas)]",
        className
      )}
      style={style}
    >
      <span
        className={cn(
          "relative block shrink-0",
          variant === "mark"
            ? compact
              ? "size-[26px]"
              : "size-10"
            : compact
              ? "h-[32px] w-[102px]"
              : "h-[44px] w-[141px]"
        )}
      >
        <img
          src={asset.light}
          alt="Relay"
          width={asset.dimensions.width}
          height={asset.dimensions.height}
          className="brand-logo-light h-full w-full object-contain"
        />
        <img
          src={asset.dark}
          alt=""
          aria-hidden="true"
          width={asset.dimensions.width}
          height={asset.dimensions.height}
          className="brand-logo-dark h-full w-full object-contain"
        />
      </span>
      {subtitle ? (
        <span className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[var(--app-muted)]">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
