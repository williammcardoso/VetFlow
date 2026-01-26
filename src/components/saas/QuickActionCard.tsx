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
          "premium-card premium-card--soft card-hover rounded-xl px-5 py-6 border transition-all group hover:-translate-y-[2px] hover:shadow-lg",
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center ring-1 ring-gray-200 group-hover:bg-gray-200/60 transition-colors">
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-semibold">{title}</div>
            {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default QuickActionCard;