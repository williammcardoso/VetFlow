"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type VfModule = "default" | "clinical" | "sales" | "finance" | "stock" | "registry" | "settings";

const stripClass: Record<VfModule, string> = {
  default: "",
  clinical: "",
  sales: "",
  finance: "",
  stock: "",
  registry: "",
  settings: "",
};

const iconClass: Record<VfModule, string> = {
  default: "text-primary bg-primary/10",
  clinical: "text-vf-clinical bg-[hsl(var(--vf-clinical)/0.12)]",
  sales: "text-vf-sales bg-[hsl(var(--vf-sales)/0.12)]",
  finance: "text-vf-finance bg-[hsl(var(--vf-finance)/0.12)]",
  stock: "text-vf-stock bg-[hsl(var(--vf-stock)/0.12)]",
  registry: "text-vf-registry bg-[hsl(var(--vf-registry)/0.12)]",
  settings: "text-vf-settings bg-[hsl(var(--vf-settings)/0.12)]",
};

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  module?: VfModule;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  breadcrumbClassName?: string;
  iconWrapperClassName?: string;
  iconClassName?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  module = "default",
  breadcrumb,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  breadcrumbClassName,
  iconWrapperClassName,
  iconClassName,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "vf-page-hero mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between",
        stripClass[module],
        "px-4 py-4 sm:px-6 sm:py-6",
        className
      )}
    >
      <div className="min-w-0 flex-1">
        {breadcrumb ? (
          <div className={cn("mb-1.5 text-xs text-muted-foreground sm:text-sm", breadcrumbClassName)}>{breadcrumb}</div>
        ) : null}
        {/* flex-nowrap + min-w-0 no título: no celular o ícone ficava numa
            linha e o título quebrava sozinho pra linha de baixo. */}
        <div className="flex items-center gap-3">
          {Icon ? (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-border/60 sm:h-11 sm:w-11",
                iconClass[module],
                iconWrapperClassName
              )}
              aria-hidden
            >
              <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", iconClassName)} strokeWidth={2} />
            </span>
          ) : null}
          <h1 className={cn("min-w-0 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl", titleClassName)}>{title}</h1>
        </div>
        {description ? (
          <p className={cn("mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground", descriptionClassName)}>
            {description}
          </p>
        ) : null}
      </div>
      {/* [&>div]:flex-wrap: várias telas passam os botões já embrulhados num
          <div className="flex ..."> próprio, sem quebra de linha — no celular
          3 botões lado a lado passavam da tela (Lista de Preços, Catálogo). */}
      {actions ? (
        <div className="flex max-w-full shrink-0 flex-wrap items-center gap-2 pt-1 sm:pt-0 [&>div]:flex-wrap">{actions}</div>
      ) : null}
    </div>
  );
}
