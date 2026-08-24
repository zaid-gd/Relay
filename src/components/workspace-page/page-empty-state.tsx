import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageEmptyStateProps = ComponentPropsWithoutRef<"div"> & {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

export function PageEmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
  className,
  ...props
}: PageEmptyStateProps) {
  return (
    <div
      data-slot="page-empty-state"
      className={cn(
        "flex min-w-0 flex-col items-center justify-center px-5 text-center",
        compact ? "py-8" : "py-12",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="mb-3 grid size-11 place-items-center rounded-[6px] bg-card text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <div className="mt-1.5 max-w-md text-sm leading-5 text-muted-foreground">
          {description}
        </div>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
