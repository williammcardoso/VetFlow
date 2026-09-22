-- Assinatura (vet + responsável) pros "documentos normais" (patient_documents
-- -- termo/atestado livre feito no editor, ou arquivo avulso anexado),
-- separado de document_signatures porque aquela tabela referencia
-- especificamente documents(id) (modelo oficial CFMV, com template/hash/
-- numeração) -- patient_documents é uma tabela mais simples, sem esse
-- schema, então precisa da própria tabela de assinaturas.
--
-- Sem coluna de status "assinado" em patient_documents: o PDF desses
-- documentos é sempre gerado na hora (ver DocumentPdfContent), então "está
-- assinado" é só "existe alguma linha aqui pra esse documento" -- o PDF já
-- busca essas assinaturas toda vez que é gerado (visualizar/baixar/mandar
-- por WhatsApp), sem precisar persistir um PDF "final".
create table if not exists public.patient_document_signatures (
  id uuid primary key default gen_random_uuid(),
  patient_document_id uuid not null references public.patient_documents(id) on delete cascade,
  tipo text not null check (tipo in ('veterinario', 'responsavel')),
  nome text not null,
  cpf text,
  funcao text,
  assinatura_imagem_path text,
  assinado_em timestamptz not null default now()
);

create index if not exists idx_patient_document_signatures_doc
  on public.patient_document_signatures (patient_document_id);

-- Um documento só tem 1 assinatura de cada papel (reassinar troca a de
-- antes em vez de empilhar) -- upsert por (patient_document_id, tipo).
create unique index if not exists patient_document_signatures_doc_tipo_unique
  on public.patient_document_signatures (patient_document_id, tipo);

comment on table public.patient_document_signatures is
  'Assinaturas (veterinário/responsável) de documentos livres (patient_documents) -- PDF gerado na hora já busca daqui, não precisa de passo de "regenerar".';

alter table public.patient_document_signatures enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_document_signatures' and policyname = 'patient_document_signatures_allow_all'
  ) then
    create policy patient_document_signatures_allow_all
      on public.patient_document_signatures for all
      using (true) with check (true);
  end if;
end $$;
