import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const columnClasses = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  5: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
} as const;

type MetricStripProps = ComponentPropsWithoutRef<"dl"> & {
  columns?: keyof typeof columnClasses;
};

export function MetricStrip({
  columns = 4,
  className,
  children,
  role,
  ...props
}: MetricStripProps) {
  return (
    <dl
      data-slot="metric-strip"
      role={
        role ??
        (props["aria-label"] || props["aria-labelledby"] ? "region" : undefined)
      }
      className={cn(
        "grid min-w-0 gap-2 text-card-foreground",
        columnClasses[columns],
        className
      )}
      {...props}
    >
      {children}
    </dl>
  );
}

type MetricItemProps = Omit<ComponentPropsWithoutRef<"div">, "title"> & {
  label: ReactNode;
  value: ReactNode;
  supporting?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
};

export function MetricItem({
  label,
  value,
  supporting,
  icon,
  action,
  className,
  ...props
}: MetricItemProps) {
  return (
    <Card
      data-slot="metric-item"
      className={cn(
        "min-w-0 p-4 shadow-none transition-colors hover:bg-muted/30",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <dt className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {icon}
            {label}
          </dt>
          <dd className="mt-1.5 text-2xl font-semibold leading-none tracking-[-0.025em] text-foreground tabular-nums">
            {value}
          </dd>
        </div>
        {action}
      </div>
      {supporting ? (
        <div className="mt-2 text-xs leading-4 text-muted-foreground">
          {supporting}
        </div>
      ) : null}
    </Card>
  );
}
