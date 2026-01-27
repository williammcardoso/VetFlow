import * as React from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaasButtonVariant = "primary" | "outline" | "soft" | "ghost";

type Props = ButtonProps & {
  saasVariant?: SaasButtonVariant;
};

export default function SaasButton({
  saasVariant = "primary",
  className,
  variant,
  ...props
}: Props) {
  const mappedVariant: ButtonProps["variant"] =
    variant ??
    (saasVariant === "primary"
      ? "default"
      : saasVariant === "ghost"
        ? "ghost"
        : saasVariant === "soft"
          ? "secondary"
          : "outline");

  return (
    <Button
      variant={mappedVariant}
      className={cn(
        "transition-all duration-200",
        saasVariant === "outline" &&
          "bg-white/70 border-border/70 hover:bg-white hover:border-border hover:shadow-sm",
        saasVariant === "soft" &&
          "bg-primary/10 text-primary border border-primary/15 hover:bg-primary/15 hover:border-primary/25 hover:shadow-sm",
        saasVariant === "ghost" && "text-muted-foreground hover:text-foreground hover:bg-muted/40",
        className
      )}
      {...props}
    />
  );
}
