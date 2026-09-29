import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Enquanto a tela é baixada (primeira vez que abre) — o menu continua na tela. */
export function PageLoading({ fullScreen }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center gap-2 text-sm text-muted-foreground", fullScreen ? "min-h-screen" : "min-h-[40vh]")}
    >
      <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
      Carregando...
    </div>
  );
}
