import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ContentSectionProps = ComponentPropsWithoutRef<typeof Card> & {
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
    <Card
      data-slot="content-section"
      className={cn("min-w-0 overflow-hidden shadow-none", className)}
      {...props}
    >
      {hasHeader ? (
        <CardHeader
          data-slot="content-section-header"
          className="flex-col justify-center py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {title ? (
                <h2 className="text-sm font-semibold text-foreground">
                  {title}
                </h2>
              ) : null}
              {metadata}
            </div>
            {description ? (
              <div className="mt-0.5 text-xs leading-4 text-muted-foreground">
                {description}
              </div>
            ) : null}
          </div>
          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent
        data-slot="content-section-body"
        className={cn(bodyMode === "flush" && "p-0", bodyClassName)}
      >
        {children}
      </CardContent>
    </Card>
  );
}
