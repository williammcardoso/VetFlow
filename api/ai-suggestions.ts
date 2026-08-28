// Função serverless do Vercel (não faz parte do bundle do Vite/React) — proxy
// pra API da OpenAI. Antes, `src/lib/aiAssistant.ts` chamava a OpenAI direto
// do navegador com a chave em `VITE_OPENAI_API_KEY` (prefixo VITE_ = vai
// embutido no JS público, qualquer um abre o DevTools e pega a chave) — além
// do risco de segurança, chamada direta do navegador pra api.openai.com
// esbarra em bloqueio de CORS/extensão, causando "Failed to fetch". Aqui a
// chamada é servidor-a-servidor (sem CORS) e a chave (`OPENAI_API_KEY`, sem
// prefixo VITE_) nunca chega no navegador.
import { AI_ASSISTANT_SYSTEM_PROMPT } from "../src/constants/aiAssistantPrompt";

interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Método não permitido." });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    res.status(500).json({
      ok: false,
      error: "Chave da API OpenAI não configurada no servidor. Adicione OPENAI_API_KEY nas variáveis de ambiente do Vercel.",
    });
    return;
  }

  const body = (req.body ?? {}) as { context?: unknown };
  const context = typeof body.context === "string" ? body.context.trim() : "";
  if (!context) {
    res.status(400).json({ ok: false, error: "Contexto da consulta vazio." });
    return;
  }

  try {
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: AI_ASSISTANT_SYSTEM_PROMPT },
          { role: "user", content: `Contexto da consulta (anamnese e exame já registrados):\n\n${context}` },
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const errBody = await openaiRes.text();
      let message = `Erro na API: ${openaiRes.status}`;
      try {
        const j = JSON.parse(errBody);
        if (j.error?.message) message = j.error.message;
      } catch {
        if (errBody) message += ` – ${errBody.slice(0, 200)}`;
      }
      res.status(502).json({ ok: false, error: message });
      return;
    }

    const data = (await openaiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim() || "A API não retornou sugestões. Tente novamente.";
    res.status(200).json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: `Falha na requisição ao provedor de IA: ${message}` });
  }
}
