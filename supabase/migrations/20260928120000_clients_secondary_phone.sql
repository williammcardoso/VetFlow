-- Segundo telefone do cliente (ex.: cônjuge, trabalho), com o nome de quem
-- atende. O antigo "Adicionar outro telefone" do cadastro não tinha coluna no
-- banco e o número digitado se perdia ao salvar.
alter table public.clients
  add column if not exists secondary_phone_contact text,
  add column if not exists secondary_phone_label text;

-- Faz a API do Supabase enxergar as colunas novas na hora.
notify pgrst, 'reload schema';
