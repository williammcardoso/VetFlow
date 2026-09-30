import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiWhatsapp } from "react-icons/si";
import { formatSendStat, getSendLog, SEND_LOGGED_EVENT, sendKey, type SendItemType, type SendStat } from "@/lib/sendLog";
import { cn } from "@/lib/utils";

const SEND_LOG_KEY = ["send-log"];

/** Contagem de envios de todos os itens (cache único para a tela toda). */
export function useSendLog(): Record<string, SendStat> {
  const queryClient = useQueryClient();
  const { data = {} } = useQuery({ queryKey: SEND_LOG_KEY, queryFn: getSendLog, staleTime: 60_000 });
  useEffect(() => {
    const onLogged = (e: Event) => {
      const { key, at } = (e as CustomEvent<{ key: string; at: string }>).detail;
      // Todo selo aberto escuta o mesmo aviso: só o primeiro soma (os
      // outros veem que esse envio já entrou) — senão 7 exames = "7×".
      queryClient.setQueryData<Record<string, SendStat>>(SEND_LOG_KEY, (prev = {}) =>
        prev[key]?.last === at ? prev : { ...prev, [key]: { count: (prev[key]?.count ?? 0) + 1, last: at } }
      );
    };
    window.addEventListener(SEND_LOGGED_EVENT, onLogged);
    return () => window.removeEventListener(SEND_LOGGED_EVENT, onLogged);
  }, [queryClient]);
  return data;
}

// "Enviado 2× · último 30/09 15:40" em vermelho embaixo do item — controle
// de quem já recebeu o laudo/receita/orçamento/documento. Não aparece se
// nunca foi enviado.
export function SentBadge({ type, id, className }: { type: SendItemType; id: string; className?: string }) {
  const log = useSendLog();
  const stat = log[sendKey(type, id)];
  if (!stat) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600", className)}
      title={`Enviado ao tutor pelo WhatsApp ${stat.count} ${stat.count === 1 ? "vez" : "vezes"}`}
    >
      <SiWhatsapp className="h-3 w-3" aria-hidden />
      {formatSendStat(stat)}
    </span>
  );
}
