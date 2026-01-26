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
  className?: string;
};

const QuickActionCard: React.FC<QuickActionCardProps> = ({ to, icon: Icon, title, subtitle, className }) => {
  return (
    <Link to={to} className="block">
      <div
        className={cn(
          "premium-card premium-card--soft card-hover rounded-xl px-6 py-5",
          "transition-all hover:-translate-y-[2px]",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gray-50 text-gray-700 flex items-center justify-center ring-1 ring-gray-200">
            <Icon className="h-6 w-6" />
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