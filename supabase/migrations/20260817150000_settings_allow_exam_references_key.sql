-- Bug de integridade de dado real: a tabela settings só aceitava
-- key IN ('company', 'user') desde a migration original (19/mar). O
-- recurso de Referências de Exame (11/ago, commit 767398f) passou a
-- salvar em key = 'examReferences' pra centralizar os valores de
-- referência (hemograma/bioquímico) entre aparelhos — mas nunca
-- funcionou, porque violava esse CHECK. Resultado: cada navegador
-- (tablet, PC) ficou com sua própria cópia isolada em localStorage,
-- nunca reconciliada, causando laudos com referência divergente
-- dependendo de qual aparelho emitiu.
--
-- Nome do constraint (settings_key_check) é o padrão que o Postgres dá
-- a um CHECK inline sem nome explícito em "key text ... CHECK (...)".

alter table public.settings drop constraint if exists settings_key_check;
alter table public.settings add constraint settings_key_check
  check (key in ('company', 'user', 'examReferences'));
