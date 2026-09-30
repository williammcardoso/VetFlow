-- Preferências do sininho (tela Configuração › Notificações) ficam na
-- tabela settings com a chave 'notifications'. O CHECK da coluna key só
-- aceitava 'company', 'user' e 'examReferences' (migration 20260817150000).

alter table public.settings drop constraint if exists settings_key_check;
alter table public.settings add constraint settings_key_check
  check (key in ('company', 'user', 'examReferences', 'notifications'));
