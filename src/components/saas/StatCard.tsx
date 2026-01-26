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

const colorMap: Record<NonNullable<StatCardProps["color"]>, { bg: string; fg: string; ring: string }> = {
  blue: { bg: "bg-sky-50", fg: "text-sky-700", ring: "ring-sky-100" },
  purple: { bg: "bg-violet-50", fg: "text-violet-700", ring: "ring-violet-100" },
  green: { bg: "bg-emerald-50", fg: "text-emerald-700", ring: "ring-emerald-100" },
  orange: { bg: "bg-amber-50", fg: "text-amber-800", ring: "ring-amber-100" },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color = "blue", className }) => {
  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "premium-card premium-card--soft card-hover rounded-xl p-6",
        "hover:-translate-y-[2px]",
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