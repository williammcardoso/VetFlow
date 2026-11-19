import React from "react";
import { cn } from "@/lib/utils";

// "*negrito*" do WhatsApp na prévia.
function WhatsAppText({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith("*") && p.endsWith("*") ? <strong key={i}>{p.slice(1, -1)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </>
  );
}

/** Fundo e balão no estilo da conversa do WhatsApp — o que a pessoa vai ver. */
export function WhatsAppPreview({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("overflow-y-auto rounded-lg bg-[#efeae2] p-3 dark:bg-[#0b141a]", className)}>
      <div className="ml-auto w-fit max-w-full rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-[13px] leading-relaxed text-[#111b21] shadow-sm dark:bg-[#005c4b] dark:text-[#e9edef]">
        <p className="whitespace-pre-wrap break-words">
          <WhatsAppText text={text} />
        </p>
      </div>
    </div>
  );
}
