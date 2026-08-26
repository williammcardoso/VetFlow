import { toast } from "sonner";
import { persistPdf, downloadPdf } from "@/lib/pdfExport";

/**
 * Envia um PDF (receita, laudo de exame, orçamento etc.) por WhatsApp: sobe o
 * arquivo e manda o link direto na mensagem (WhatsApp não aceita anexo via
 * link, só texto) — compartilhado entre as telas pra não duplicar a validação
 * de telefone/formatação de mensagem em cada botão.
 */
export async function sendPdfViaWhatsApp(opts: {
  phone: string | undefined | null;
  blob: Blob;
  fileName: string;
  folder: string;
  title: string;
  intro: string;
  dateLabel: string;
}): Promise<void> {
  const raw = (opts.phone ?? "").replace(/\D/g, "");
  if (raw.length < 10) {
    toast.error("Este cliente não tem um telefone válido cadastrado. Atualize o telefone no cadastro do cliente para enviar por WhatsApp.");
    return;
  }
  const num = raw.length <= 10 ? "55" + raw : raw.startsWith("55") ? raw : "55" + raw;

  const buildMsg = (link?: string) => {
    const parts = [
      `🐾 *${opts.title}*`,
      "",
      opts.intro,
      `🗓️ ${opts.dateLabel}`,
      "",
      link ? `📎 Abra o PDF aqui:\n${link}` : "📎 O PDF foi baixado — por favor anexe o arquivo e envie.",
      "",
      "Qualquer dúvida, é só chamar! 💬",
    ];
    return encodeURIComponent(parts.join("\n"));
  };

  // api.whatsapp.com/send direto, em vez de wa.me — wa.me é um redirect da
  // própria Meta que, ao converter pra api.whatsapp.com/send, corrompe
  // emoji de 4 bytes no meio do caminho (confirmado testando o link real:
  // %F0%9F%90%BE certo em wa.me virava %EF%BF%BD no api.whatsapp.com/send
  // gerado por eles ~1s depois). Indo direto no endpoint final, pula essa
  // conversão que estava mastigando os emoji.
  const pdfUrl = await persistPdf(opts.blob, { folder: opts.folder, fileName: opts.fileName });
  if (pdfUrl) {
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${buildMsg(pdfUrl)}`, "_blank");
    toast.success("WhatsApp aberto com o link do documento.");
  } else {
    // Não deu pra subir o PDF pro storage (ver console — [persistPdf] loga o motivo).
    // Cai pro download local, mas isso não é "sucesso equivalente" ao link, então
    // avisa como problema em vez de toast.success — antes os dois casos pareciam
    // idênticos pro usuário (mesmo toast verde), escondendo que o link falhou.
    console.warn("[sendPdfViaWhatsApp] não foi possível gerar o link do PDF; caindo para download local.");
    await downloadPdf({ blob: opts.blob, fileName: opts.fileName, persist: false });
    window.open(`https://api.whatsapp.com/send?phone=${num}&text=${buildMsg()}`, "_blank");
    toast.warning("Não consegui gerar o link do PDF agora — baixei o arquivo, anexe manualmente no WhatsApp que abriu.");
  }
}
