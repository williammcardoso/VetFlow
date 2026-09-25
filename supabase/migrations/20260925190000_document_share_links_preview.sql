-- Prévia do link curto (/d/:code) no WhatsApp: título e descrição de cada
-- link, pra prévia mostrar "Hemograma Completo — Jack" em vez do genérico
-- "VetFlow - Gestão Veterinária". O robô que monta a prévia não roda
-- JavaScript — quem responde o /d/:code agora é a função api/share-link.ts
-- do Vercel, que lê estas colunas e devolve as tags og:title/og:description.
--
-- Nullable de propósito: links criados antes desta migration (ou se o
-- título não vier) continuam funcionando, só com a prévia genérica. O app
-- também grava o link sem estas colunas se a migration ainda não tiver sido
-- aplicada (ver createShareLink em src/lib/documentShareLinksApi.ts).
alter table public.document_share_links
  add column if not exists title text,
  add column if not exists description text;

comment on column public.document_share_links.title is
  'Título da prévia do link no WhatsApp (og:title), ex.: "Hemograma Completo — Jack".';
comment on column public.document_share_links.description is
  'Linha de baixo da prévia (og:description), ex.: "Resultado de exame · 25/09/2026 16:04 · Clínica".';

-- Faz a API do Supabase (PostgREST) enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
