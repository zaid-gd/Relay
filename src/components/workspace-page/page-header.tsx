import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = Omit<ComponentPropsWithoutRef<"header">, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex min-w-0 flex-col gap-4 pb-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <div className="mt-1.5 max-w-3xl text-[13px] leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div
          data-slot="page-header-actions"
          className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end"
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
