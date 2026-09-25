// Link curto /d/:code (vercel.json reescreve pra cá) — responde do servidor
// em vez da SPA pra que a prévia do WhatsApp mostre o título do documento
// ("Hemograma Completo — Jack"): o robô que monta a prévia não roda
// JavaScript, só lê as tags og:* do HTML. Como a SPA devolvia o mesmo
// index.html pra todo link, a prévia saía sempre "VetFlow - Gestão
// Veterinária". Quem clica é redirecionado na hora pro PDF (mais rápido que
// antes, quando o link carregava o sistema inteiro só pra redirecionar).
//
// Se algo falhar (variáveis de ambiente ausentes, Supabase fora, código
// inexistente), cai pra rota da SPA /documento/:code, que faz o mesmo
// redirecionamento pelo navegador como sempre fez — o link nunca quebra.
//
// Autocontida (sem importar de src/) — ver o comentário em
// exam-interpretation.ts sobre o empacotamento das Functions do Vercel.

interface VercelRequest {
  method?: string;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
  headers?: Record<string, string | string[] | undefined>;
}
interface VercelResponse {
  status: (code: number) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
  end: () => void;
}
interface ShareLinkRow {
  target_url?: string | null;
  title?: string | null;
  description?: string | null;
}

// Códigos gerados por generateShortCode() (8 caracteres hex); aceita uma
// faixa maior por folga, mas nunca nada que precise de escape na URL.
const CODE_RE = /^[A-Za-z0-9_-]{4,64}$/;
const FETCH_TIMEOUT_MS = 4000;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function redirect(res: VercelResponse, location: string): void {
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.status(302).end();
}

async function fetchShareLink(code: string): Promise<ShareLinkRow | null> {
  const baseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "";
  if (!baseUrl || !key) return null;

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  // Primeiro com título/descrição; se a migration das colunas da prévia
  // ainda não foi aplicada, o Supabase recusa o select (400) — aí busca só o
  // destino e a prévia fica genérica.
  for (const select of ["target_url,title,description", "target_url"]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(
        `${baseUrl}/rest/v1/document_share_links?select=${select}&code=eq.${encodeURIComponent(code)}&limit=1`,
        { headers, signal: controller.signal }
      );
      if (!response.ok) continue;
      const rows = (await response.json()) as ShareLinkRow[];
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const code = firstValue(req.query?.code).trim();
  const spaFallback = `/documento/${encodeURIComponent(code)}`;
  if (!CODE_RE.test(code)) {
    redirect(res, spaFallback);
    return;
  }

  let link: ShareLinkRow | null = null;
  try {
    link = await fetchShareLink(code);
  } catch (e) {
    console.error("[share-link] falha ao buscar o link", e);
    link = null;
  }

  const target = (link?.target_url || "").trim();
  // Só http(s): nunca redirecionar pra "javascript:" ou afins, mesmo que
  // algo estranho tenha sido gravado na tabela.
  if (!/^https?:\/\//i.test(target)) {
    redirect(res, spaFallback);
    return;
  }

  const title = (link?.title || "").trim() || "Documento — VetFlow";
  const description = (link?.description || "").trim() || "Toque para abrir o documento (PDF).";
  const host = firstValue(req.headers?.["x-forwarded-host"]) || firstValue(req.headers?.host);
  const origin = host ? `https://${host}` : "";

  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const targetAttr = escapeHtml(target);
  const targetJs = JSON.stringify(target).replace(/</g, "\\u003c");
  const imageTags = origin
    ? `<meta property="og:image" content="${escapeHtml(`${origin}/vetflow-icon.png`)}">
<meta property="og:image:width" content="780">
<meta property="og:image:height" content="780">
<meta property="og:url" content="${escapeHtml(`${origin}/d/${code}`)}">`
    : "";

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="robots" content="noindex, nofollow">
<meta property="og:type" content="website">
<meta property="og:site_name" content="VetFlow">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
${imageTags}
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta http-equiv="refresh" content="0;url=${targetAttr}">
<script>location.replace(${targetJs});</script>
</head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#1f2937;text-align:center;padding:32px 16px">
<p>Abrindo o documento…</p>
<p><a href="${targetAttr}" style="color:#0f766e">Toque aqui se não abrir sozinho</a></p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  // O código aponta sempre pro mesmo PDF (link nunca é editado), então pode
  // ficar em cache na borda; o navegador revalida em 5 min.
  res.setHeader("Cache-Control", "public, max-age=300, s-maxage=86400");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.status(200).send(html);
}
