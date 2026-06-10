"use client";

import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type QuickActionCardProps = {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  tone?: "clinical" | "sales" | "finance" | "stock" | "registry" | "settings" | "neutral";
  className?: string;
};

const toneMap: Record<NonNullable<QuickActionCardProps["tone"]>, { chip: string; icon: string; frame: string }> = {
  clinical: {
    chip: "bg-[hsl(var(--vf-clinical)/0.14)]",
    icon: "text-vf-clinical",
    frame: "hover:border-[hsl(var(--vf-clinical)/0.35)]",
  },
  sales: {
    chip: "bg-[hsl(var(--vf-sales)/0.14)]",
    icon: "text-vf-sales",
    frame: "hover:border-[hsl(var(--vf-sales)/0.35)]",
  },
  finance: {
    chip: "bg-[hsl(var(--vf-finance)/0.14)]",
    icon: "text-vf-finance",
    frame: "hover:border-[hsl(var(--vf-finance)/0.35)]",
  },
  stock: {
    chip: "bg-[hsl(var(--vf-stock)/0.14)]",
    icon: "text-vf-stock",
    frame: "hover:border-[hsl(var(--vf-stock)/0.35)]",
  },
  registry: {
    chip: "bg-[hsl(var(--vf-registry)/0.14)]",
    icon: "text-vf-registry",
    frame: "hover:border-[hsl(var(--vf-registry)/0.35)]",
  },
  settings: {
    chip: "bg-[hsl(var(--vf-settings)/0.14)]",
    icon: "text-vf-settings",
    frame: "hover:border-[hsl(var(--vf-settings)/0.35)]",
  },
  neutral: {
    chip: "bg-primary/10",
    icon: "text-primary",
    frame: "hover:border-primary/35",
  },
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  to,
  icon: Icon,
  title,
  subtitle,
  tone = "neutral",
  className,
}) => {
  const colors = toneMap[tone];
  return (
    <Link to={to} className="block">
      <div
        className={cn(
          "premium-card premium-card--soft card-hover rounded-xl border border-border px-6 py-5",
          "transition-all hover:-translate-y-[2px]",
          colors.frame,
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-border/60", colors.chip)}>
            <Icon className={cn("h-6 w-6", colors.icon)} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold leading-snug">{title}</div>
            {subtitle && <div className="mt-0.5 text-sm text-muted-foreground leading-relaxed">{subtitle}</div>}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default QuickActionCard;