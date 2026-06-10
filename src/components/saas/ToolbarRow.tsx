import * as React from "react";
import { cn } from "@/lib/utils";

interface ToolbarRowProps {
  children: React.ReactNode;
  className?: string;
}

export function ToolbarRow({ children, className }: ToolbarRowProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-muted/30 p-3.5 shadow-sm",
        "[&_.vf-toolbar-control]:h-9 [&_.vf-toolbar-control]:text-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
