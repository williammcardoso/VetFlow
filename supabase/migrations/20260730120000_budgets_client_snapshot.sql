-- Orçamento é um documento entregue ao tutor: guarda o nome/telefone como
-- estavam no momento da emissão, para reimpressão fiel mesmo que o cadastro
-- do cliente mude depois (mesma lógica do custo em sale_items).

alter table public.budgets
  add column if not exists client_name text,
  add column if not exists animal_name text,
  add column if not exists client_phone text;
