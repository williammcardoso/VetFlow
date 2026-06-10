"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { VfModule } from "@/components/saas/PageHeader";

type VfCardProps = React.ComponentProps<typeof Card> & {
  tone?: Exclude<VfModule, "default">;
};

/** Card alinhado ao kit visual VetFlow (borda, raio, hover suave). */
export function VfCard({ className, tone, ...props }: VfCardProps) {
  const toneClass =
    tone === "clinical"
      ? "vf-tone-clinical"
      : tone === "sales"
        ? "vf-tone-sales"
        : tone === "finance"
          ? "vf-tone-finance"
          : tone === "stock"
            ? "vf-tone-stock"
            : tone === "registry"
              ? "vf-tone-registry"
              : tone === "settings"
                ? "vf-tone-settings"
                : "";

  return <Card className={cn("vf-surface-card", toneClass, className)} {...props} />;
}
