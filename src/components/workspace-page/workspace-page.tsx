import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type WorkspacePageProps = ComponentPropsWithoutRef<"div"> & {
  mode?: "document" | "fill";
  family:
    | "data-index"
    | "master-detail"
    | "canvas"
    | "library"
    | "administration"
    | "conversation";
};

export function WorkspacePage({
  mode = "document",
  family,
  className,
  children,
  ...props
}: WorkspacePageProps) {
  return (
    <div
      data-slot="workspace-page"
      data-design="studio-split"
      data-mode={mode}
      data-family={family}
      className={cn(
        "w-full min-w-0 px-4 pb-8 pt-5 sm:px-5 lg:px-5 lg:pb-10 lg:pt-5",
        mode === "document"
          ? ""
          : "flex min-h-0 flex-col gap-5 lg:h-full lg:overflow-hidden lg:pb-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
