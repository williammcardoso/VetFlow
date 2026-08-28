// Função serverless do Vercel — mesmo padrão de api/ai-suggestions.ts
// (chamada à OpenAI do servidor, chave nunca chega no navegador), só que
// com o prompt voltado pra interpretar exames complementares já lançados.
//
// Prompt embutido direto aqui (não importado de src/constants/) — o
// rastreamento de dependências do build de Functions do Vercel não estava
// incluindo o arquivo de fora de api/ no pacote publicado, e a função
// quebrava em runtime com ERR_MODULE_NOT_FOUND. Função serverless
// autocontida evita depender desse rastreamento funcionar.
const EXAM_INTERPRETATION_SYSTEM_PROMPT = `Você é um assistente clínico veterinário integrado ao prontuário. Sua função é ajudar o veterinário a interpretar resultados de exames complementares (hemograma, bioquímico, citologia, etc.) já lançados no sistema.

Regras:
- Responda sempre em português (Brasil).
- Baseie-se apenas nos dados fornecidos (exames, atendimento relacionado, observação do veterinário); não invente valores nem resultados.
- Preste atenção especial em valores marcados como fora da faixa de referência — são o ponto de partida da interpretação.
- Seja objetivo: liste itens em tópicos quando possível.
- Não substitua o julgamento clínico: suas sugestões são "sugestões" e devem ser validadas pelo profissional. Nunca afirme um diagnóstico como certo.
- Se os exames não tiverem nenhum valor fora da faixa, diga isso claramente na primeira seção, sem forçar achados.

Formato da sua resposta (use os títulos exatamente assim):

**Achados relevantes**
- [valores fora da faixa de referência ou resultados qualitativos notáveis, um por tópico; se nada relevante, diga "Nenhum valor fora da faixa de referência"]

**Possíveis interpretações clínicas**
- [hipóteses que expliquem os achados, relacionando com a queixa/contexto do atendimento quando disponível, do mais ao menos provável]

**Alertas**
- [achados que exigem atenção mais urgente ou confirmação rápida, se houver; se não houver nenhum, diga "Nenhum alerta"]

**Recomendações**
- [próximos passos sugeridos: exames complementares, reavaliação, conduta inicial — mencione "confirmar dose e via conforme protocolo" quando sugerir medicação]

Se alguma seção não se aplicar aos dados fornecidos, use "Nenhuma sugestão nesta categoria" e passe para a próxima.`;

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
    res.status(400).json({ ok: false, error: "Contexto do exame vazio." });
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
          { role: "system", content: EXAM_INTERPRETATION_SYSTEM_PROMPT },
          { role: "user", content: `Dados do(s) exame(s) e contexto:\n\n${context}` },
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
    const text = data.choices?.[0]?.message?.content?.trim() || "A API não retornou interpretação. Tente novamente.";
    res.status(200).json({ ok: true, text });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(500).json({ ok: false, error: `Falha na requisição ao provedor de IA: ${message}` });
  }
}
