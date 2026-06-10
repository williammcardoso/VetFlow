import * as React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableFrameProps {
  children: React.ReactNode;
  stickyHeader?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyCta?: React.ReactNode;
  className?: string;
}

export function DataTableFrame({
  children,
  stickyHeader = false,
  empty = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription = "Ajuste os filtros ou adicione um novo item.",
  emptyCta,
  className,
}: DataTableFrameProps) {
  if (empty) {
    return (
      <div className={cn("rounded-2xl border border-dashed border-border/80 bg-muted/30 p-8 text-center", className)}>
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Inbox className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
        {emptyCta ? <div className="mt-4">{emptyCta}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm", className)}>
      <div
        className={cn(
          "overflow-x-auto [&_tbody_tr:nth-child(odd)]:bg-muted/20 [&_tbody_tr:hover]:bg-accent/50",
          stickyHeader && "[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-card"
        )}
      >
        {children}
      </div>
    </div>
  );
}
