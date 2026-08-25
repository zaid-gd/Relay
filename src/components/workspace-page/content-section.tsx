import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ContentSectionProps = ComponentPropsWithoutRef<"section"> & {
  title?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  actions?: ReactNode;
  bodyMode?: "padded" | "flush";
  bodyClassName?: string;
};

export function ContentSection({
  title,
  description,
  metadata,
  actions,
  bodyMode = "padded",
  bodyClassName,
  className,
  children,
  ...props
}: ContentSectionProps) {
  const hasHeader = title || description || metadata || actions;

  return (
    <section
      data-slot="content-section"
      className={cn(
        "min-w-0 overflow-hidden rounded-[6px] bg-card text-card-foreground",
        className,
      )}
      {...props}
    >
      {hasHeader ? (
        <header
          data-slot="content-section-header"
          className="flex min-h-12 flex-col justify-center gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
              {metadata}
            </div>
            {description ? (
              <div className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}
      <div
        data-slot="content-section-body"
        className={cn(bodyMode === "padded" && "p-4", bodyClassName)}
      >
        {children}
      </div>
    </section>
  );
}
