import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type DataTableFrameProps = ComponentPropsWithoutRef<"section"> & {
  header?: ReactNode;
  footer?: ReactNode;
  bounded?: boolean;
  bodyClassName?: string;
  bodyLabel?: string;
};

export function DataTableFrame({
  header,
  footer,
  bounded = false,
  bodyClassName,
  bodyLabel,
  className,
  children,
  ...props
}: DataTableFrameProps) {
  return (
    <section
      data-slot="data-table-frame"
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-[6px] bg-card text-card-foreground",
        bounded && "min-h-0",
        className,
      )}
      {...props}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      <div
        data-slot="data-table-frame-body"
        aria-label={bodyLabel}
        tabIndex={bounded && bodyLabel ? 0 : undefined}
        className={cn(
          "min-w-0 overscroll-contain overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          bounded && "min-h-0 flex-1 overflow-y-auto",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? <div className="shrink-0">{footer}</div> : null}
    </section>
  );
}
