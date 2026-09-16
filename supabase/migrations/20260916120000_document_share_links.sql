-- Link curto pra PDF compartilhado por WhatsApp (receita, laudo, orçamento,
-- documento) -- sem isso, a mensagem carrega a URL bruta do Supabase Storage
-- (dominio do projeto + bucket + pasta + nome do arquivo), que fica enorme
-- na pré-visualização do WhatsApp. `code` é gerado no cliente (curto,
-- aleatório) e a rota pública /d/:code busca aqui e redireciona pra
-- target_url de verdade.
--
-- allow_all (anon le/escreve) -- mesmo padrão do resto do app (schedules,
-- documents etc.): quem tem a chave anônima já tem acesso equivalente.
-- target_url não é segredo nenhum: é a mesma URL pública do Storage que a
-- pessoa já teria recebido sem o link curto.
create table if not exists public.document_share_links (
  code text primary key,
  target_url text not null,
  created_at timestamptz not null default now()
);

comment on table public.document_share_links is
  'Link curto (/d/:code) pra PDF compartilhado por WhatsApp -- redireciona pra target_url (URL real no Supabase Storage).';

alter table public.document_share_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'document_share_links' and policyname = 'document_share_links_allow_all'
  ) then
    create policy document_share_links_allow_all
      on public.document_share_links for all
      using (true) with check (true);
  end if;
end $$;
