import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export type SectionTone =
  | "neutral"
  | "clinical"
  | "sales"
  | "finance"
  | "stock"
  | "registry"
  | "settings";

interface SectionCardProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  tone: SectionTone;
  children: React.ReactNode;
  className?: string;
}

const toneStyles: Record<
  SectionTone,
  { icon: string; chipBg: string; chipFg: string; title: string }
> = {
  neutral: {
    icon: "text-primary",
    chipBg: "bg-primary/10",
    chipFg: "text-primary",
    title: "text-foreground",
  },
  clinical: {
    icon: "text-[hsl(var(--vf-clinical))]",
    chipBg: "bg-[hsl(var(--vf-clinical))]/12",
    chipFg: "text-[hsl(var(--vf-clinical))]",
    title: "text-foreground",
  },
  sales: {
    icon: "text-[hsl(var(--vf-sales))]",
    chipBg: "bg-[hsl(var(--vf-sales))]/12",
    chipFg: "text-[hsl(var(--vf-sales))]",
    title: "text-foreground",
  },
  finance: {
    icon: "text-[hsl(var(--vf-finance))]",
    chipBg: "bg-[hsl(var(--vf-finance))]/12",
    chipFg: "text-[hsl(var(--vf-finance))]",
    title: "text-foreground",
  },
  stock: {
    icon: "text-[hsl(var(--vf-stock))]",
    chipBg: "bg-[hsl(var(--vf-stock))]/12",
    chipFg: "text-[hsl(var(--vf-stock))]",
    title: "text-foreground",
  },
  registry: {
    icon: "text-[hsl(var(--vf-registry))]",
    chipBg: "bg-[hsl(var(--vf-registry))]/12",
    chipFg: "text-[hsl(var(--vf-registry))]",
    title: "text-foreground",
  },
  settings: {
    icon: "text-[hsl(var(--vf-settings))]",
    chipBg: "bg-[hsl(var(--vf-settings))]/12",
    chipFg: "text-[hsl(var(--vf-settings))]",
    title: "text-foreground",
  },
};

export function SectionCard({ title, description, icon: Icon, tone, children, className }: SectionCardProps) {
  const style = toneStyles[tone];

  return (
    <Card
      className={cn(
        "vf-surface-card card-hover no-card-lift relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
        "transition-all duration-200",
        className
      )}
    >
      <div className="border-b border-border/70 px-4 py-3.5">
        <div className="flex items-start gap-2">
          <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/50", style.chipBg)}>
            <Icon className={cn("h-5 w-5", style.icon, style.chipFg)} />
          </div>
          <div>
            <h2 className={cn("text-base font-semibold", style.title)}>{title}</h2>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </Card>
  );
}
