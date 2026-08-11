-- Cadastro de Pelagens (Cadastros > Pelagens) estava vazio: a tabela
-- "registry" nunca recebeu linhas com key='coatTypes' (a lista antiga era
-- hardcoded em AddAnimalPage.tsx e foi removida quando a tela passou a ler
-- do Supabase via useRegistryList("coatTypes"), sem migrar os dados).
-- Idempotente: usa "where not exists" por nome, seguro rodar mais de uma vez.

insert into public.registry (id, key, name, extra)
select gen_random_uuid()::text, 'coatTypes', v.name, '{}'::jsonb
from (values
  ('Amarelo'),
  ('Bicolor (Duas cores)'),
  ('Branco'),
  ('Caramelo (Dourado/Fulvo)'),
  ('Cinza (Azul/Prata)'),
  ('Creme (Bege)'),
  ('Laranja (Vermelho)'),
  ('Malhado (Com manchas)'),
  ('Marrom (Chocolate)'),
  ('Preto'),
  ('Tigrado (Listrado)'),
  ('Tricolor (Três cores)')
) as v(name)
where not exists (
  select 1 from public.registry r where r.key = 'coatTypes' and r.name = v.name
);
