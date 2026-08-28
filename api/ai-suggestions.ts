// Função serverless do Vercel (não faz parte do bundle do Vite/React) — proxy
// pra API da OpenAI. Antes, `src/lib/aiAssistant.ts` chamava a OpenAI direto
// do navegador com a chave em `VITE_OPENAI_API_KEY` (prefixo VITE_ = vai
// embutido no JS público, qualquer um abre o DevTools e pega a chave) — além
// do risco de segurança, chamada direta do navegador pra api.openai.com
// esbarra em bloqueio de CORS/extensão, causando "Failed to fetch". Aqui a
// chamada é servidor-a-servidor (sem CORS) e a chave (`OPENAI_API_KEY`, sem
// prefixo VITE_) nunca chega no navegador.
//
// Prompt embutido direto aqui (não importado de src/constants/) — o
// rastreamento de dependências do build de Functions do Vercel não estava
// incluindo o arquivo de fora de api/ no pacote publicado, e a função
// quebrava em runtime com ERR_MODULE_NOT_FOUND. Função serverless
// autocontida evita depender desse rastreamento funcionar.
const AI_ASSISTANT_SYSTEM_PROMPT = `Você é um assistente clínico veterinário integrado ao prontuário. Sua função é ajudar o veterinário durante a consulta com base nas informações já registradas na anamnese e no exame.

Regras:
- Responda sempre em português (Brasil).
- Baseie-se apenas nas informações fornecidas no contexto; não invente dados.
- Seja objetivo: liste itens em tópicos quando possível.
- Não substitua o julgamento clínico: suas sugestões são "sugestões" e devem ser validadas pelo profissional.
- Se o contexto estiver vazio ou muito escasso, sugira perguntas para o tutor para enriquecer a anamnese.

Formato da sua resposta (use os títulos exatamente assim):

**Perguntas sugeridas para o tutor**
- [lista de 2 a 5 perguntas que ajudem a refinar a queixa ou o histórico]

**Hipóteses diagnósticas**
- [lista de possíveis diagnósticos, do mais ao menos provável, com breve justificativa se relevante]

**Exames sugeridos**
- [lista de exames complementares que possam ajudar a confirmar ou afastar as hipóteses]

**Medicações/condutas sugeridas**
- [sugestões de medicamentos ou condutas iniciais, com cuidado a contraindicações; mencione "confirmar dose e via conforme protocolo" quando apropriado]

Se alguma seção não se aplicar ao contexto, use "Nenhuma sugestão nesta categoria" e passe para a próxima.`;

interface VercelRequest {
  method?: string;
  body?: unknown;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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

  // Recebe o histórico inteiro da conversa (contexto inicial + perguntas de
  // acompanhamento já feitas) — permite continuar perguntando sobre a mesma
  // sugestão, em vez de cada geração ser isolada sem memória do que já foi
  // dito. O cliente (src/lib/aiAssistant.ts) monta esse array.
  const body = (req.body ?? {}) as { messages?: unknown };
  const messages = Array.isArray(body.messages)
    ? (body.messages as ChatMessage[]).filter(
        (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
      )
    : [];
  if (messages.length === 0) {
    res.status(400).json({ ok: false, error: "Nenhuma mensagem enviada." });
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
        messages: [{ role: "system", content: AI_ASSISTANT_SYSTEM_PROMPT }, ...messages],
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
