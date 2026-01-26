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
  blue: { bg: "bg-blue-50", fg: "text-blue-600", ring: "ring-blue-100" },
  purple: { bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
  green: { bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
  orange: { bg: "bg-orange-50", fg: "text-orange-600", ring: "ring-orange-100" },
};

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon: Icon, color = "blue", className }) => {
  const colors = colorMap[color];
  return (
    <div
      className={cn(
        "premium-card premium-card--soft card-hover rounded-xl p-5 border transition-all",
        "hover:-translate-y-[2px]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-muted-foreground">{title}</div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", colors.bg, colors.fg, "ring-1", colors.ring)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-muted-foreground">{subtitle}</div>}
    </div>
  );
};

export default StatCard;