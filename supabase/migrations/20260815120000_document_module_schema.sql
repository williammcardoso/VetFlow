-- Módulo de Documentos (termos de consentimento, atestados e afins) da
-- Resolução CFMV nº 1.321/2020, alterada pela nº 1.653/2025. Schema com
-- versionamento imutável de modelo: editar o texto de um modelo publica
-- uma versão nova, nunca sobrescreve a existente; documento emitido guarda
-- um payload congelado (snapshot) e aponta para a versão exata do modelo
-- usada na emissão, então continua legível fielmente mesmo que o modelo
-- mude depois. Mono-clínica de propósito — este VetFlow não é multi-tenant,
-- então não existe clinica_id em nenhuma das tabelas abaixo.

-- ── document_templates ──────────────────────────────────────────────
-- O modelo em si (identidade estável, ex.: código A1, B6, B2-C). O texto
-- vive em document_template_versions, nunca aqui.
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  titulo text not null,
  grupo text not null check (grupo in ('atestados', 'consentimento', 'recusa', 'administrativo')),
  categoria text,
  base_legal text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists document_templates_codigo_unique
  on public.document_templates (codigo);

comment on table public.document_templates is
  'Modelo de documento (identidade estável, ex.: código A1, B6, B2-C) — o texto em si vive em document_template_versions.';

create or replace function public.set_document_templates_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_document_templates_updated_at on public.document_templates;
create trigger trg_document_templates_updated_at
before update on public.document_templates
for each row
execute function public.set_document_templates_updated_at();

alter table public.document_templates enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_templates' and policyname = 'document_templates_allow_all'
  ) then
    create policy document_templates_allow_all
      on public.document_templates for all
      using (true) with check (true);
  end if;
end $$;

-- ── document_template_versions ──────────────────────────────────────
-- Versão publicada é imutável: corrigir o texto sempre insere uma linha
-- nova aqui, nunca UPDATE em corpo/variaveis_requeridas de uma versão que
-- já tenha sido publicada.
create table if not exists public.document_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.document_templates(id) on delete cascade,
  versao integer not null,
  corpo text not null,
  variaveis_requeridas jsonb not null default '[]'::jsonb,
  campos_formulario jsonb not null default '[]'::jsonb,
  exige_assinatura_responsavel boolean not null default true,
  exige_testemunhas boolean not null default false,
  numero_vias integer not null default 2,
  publicado_em timestamptz not null default now(),
  publicado_por uuid references public.app_users(id)
);

create unique index if not exists document_template_versions_template_versao_unique
  on public.document_template_versions (template_id, versao);

comment on table public.document_template_versions is
  'Texto publicado de um modelo, versionado e imutável. documents sempre aponta para uma versão específica, nunca para o template.';

alter table public.document_template_versions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_template_versions' and policyname = 'document_template_versions_allow_all'
  ) then
    create policy document_template_versions_allow_all
      on public.document_template_versions for all
      using (true) with check (true);
  end if;
end $$;

-- ── documents ────────────────────────────────────────────────────────
-- Documento emitido para um paciente/responsável. paciente_id, responsavel_id
-- e atendimento_id são uuid "soltos" (sem FK) porque animals/clients/
-- appointments não foram criados por migration neste projeto — mesmo
-- padrão já usado em patient_observations.animal_id e
-- purchase_items.transaction_id.
create sequence if not exists public.documents_numero_seq as integer;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.document_template_versions(id),
  numero integer not null default nextval('public.documents_numero_seq'),
  atendimento_id uuid,
  paciente_id uuid not null,
  responsavel_id uuid not null,
  vet_id uuid references public.app_users(id),
  payload jsonb not null default '{}'::jsonb,
  corpo_renderizado text,
  pdf_path text,
  hash_sha256 text,
  status text not null default 'rascunho' check (status in ('rascunho', 'emitido', 'assinado', 'cancelado')),
  emitido_em timestamptz,
  cancelado_em timestamptz,
  motivo_cancelamento text,
  documento_substituto_id uuid references public.documents(id),
  created_at timestamptz not null default now()
);

create unique index if not exists documents_numero_unique on public.documents (numero);
create index if not exists idx_documents_paciente on public.documents (paciente_id);
create index if not exists idx_documents_responsavel on public.documents (responsavel_id);
create index if not exists idx_documents_atendimento on public.documents (atendimento_id);
create unique index if not exists documents_hash_unique
  on public.documents (hash_sha256) where hash_sha256 is not null;

comment on table public.documents is
  'Documento emitido a partir de um document_template_versions. payload é snapshot congelado no momento da emissão — nunca renderizar documento já emitido fazendo join com dados vivos (cliente/paciente podem mudar depois). emitido/assinado é imutável: correção é cancelamento (motivo obrigatório) + reemissão via documento_substituto_id.';

alter table public.documents enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_allow_all'
  ) then
    create policy documents_allow_all
      on public.documents for all
      using (true) with check (true);
  end if;
end $$;

-- ── document_signatures ─────────────────────────────────────────────
-- Um documento pode ter múltiplos signatários (responsável, vet, até duas
-- testemunhas quando há recusa de assinatura).
create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  tipo text not null check (tipo in ('responsavel', 'veterinario', 'testemunha')),
  nome text not null,
  cpf text,
  funcao text,
  metodo text not null check (metodo in ('fisica_digitalizada', 'canvas', 'icp_brasil')),
  assinatura_imagem_path text,
  assinado_em timestamptz not null default now(),
  ip text,
  user_agent text,
  geolocalizacao jsonb
);

create index if not exists idx_document_signatures_document on public.document_signatures (document_id);

comment on table public.document_signatures is
  'Assinaturas coletadas por documento.';

alter table public.document_signatures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_signatures' and policyname = 'document_signatures_allow_all'
  ) then
    create policy document_signatures_allow_all
      on public.document_signatures for all
      using (true) with check (true);
  end if;
end $$;

-- ── validação pública (QR code impresso no PDF, rota /validar/:hash) ──
-- Devolve só o mínimo para confirmar autenticidade — nunca o payload
-- (CPF, endereço, diagnóstico...). Diferente das demais tabelas deste
-- módulo (allow_all, mesmo padrão do resto do app, pensado pra quem já
-- tem a chave anônima), esta rota é impressa em papel e pode ser acessada
-- por qualquer pessoa que receba o documento físico — público bem mais
-- amplo, por isso passa por uma função dedicada em vez de expor a tabela.
create or replace function public.validar_documento(p_hash text)
returns table (
  numero integer,
  codigo_modelo text,
  titulo_modelo text,
  status text,
  emitido_em timestamptz,
  cancelado_em timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    d.numero,
    dt.codigo,
    dt.titulo,
    d.status,
    d.emitido_em,
    d.cancelado_em
  from public.documents d
  join public.document_template_versions dtv on dtv.id = d.template_version_id
  join public.document_templates dt on dt.id = dtv.template_id
  where d.hash_sha256 = p_hash
  limit 1;
end;
$$;

grant execute on function public.validar_documento(text) to anon, authenticated;
