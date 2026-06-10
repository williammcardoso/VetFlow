"use client";

import React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "blue" | "purple" | "green" | "orange";
  className?: string;
};

const colorMap: Record<NonNullable<StatCardProps["color"]>, { bg: string; fg: string; ring: string; frame: string }> = {
  blue: {
    bg: "bg-sky-50 dark:bg-sky-950/50",
    fg: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-100 dark:ring-sky-800/60",
    frame: "hover:border-sky-200/80 dark:hover:border-sky-800/70",
  },
  purple: {
    bg: "bg-violet-50 dark:bg-violet-950/50",
    fg: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-100 dark:ring-violet-900/50",
    frame: "hover:border-violet-200/80 dark:hover:border-violet-800/70",
  },
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    fg: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-100 dark:ring-emerald-900/50",
    frame: "hover:border-emerald-200/80 dark:hover:border-emerald-800/70",
  },
  orange: {
    bg: "bg-amber-50 dark:bg-amber-950/45",
    fg: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-100 dark:ring-amber-900/50",
    frame: "hover:border-amber-200/80 dark:hover:border-amber-800/70",
  },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color = "blue", className }) => {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "premium-card premium-card--soft card-hover rounded-xl border border-border p-6",
        "hover:-translate-y-[2px]",
        colors.frame,
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-muted-foreground leading-relaxed">{title}</div>
          <div className="mt-2 text-[34px] leading-none font-bold tracking-tight">{value}</div>
          {subtitle && <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</div>}
        </div>

        <div
          className={cn(
            "h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center",
            colors.bg,
            colors.fg,
            "ring-1",
            colors.ring
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;