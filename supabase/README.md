# Supabase — VetFlow

## Aplicar migrações

1. Abra o **SQL Editor** no painel do Supabase.
2. Cole o conteúdo de `migrations/20260319210000_settings_schedules.sql` e execute.

Isso cria:

- `public.settings` — chaves `company` e `user`, coluna `value` (jsonb).
- `public.schedules` — agenda operacional (separada de `appointments` clínicos).

## RLS

As policies atuais permitem **anon + authenticated** leitura/escrita em `settings` e `schedules` (adequado para desenvolvimento / app sem login).

**Produção:** restrinja policies (ex.: apenas `authenticated` com `auth.uid()` ou service role no backend).

## Migração de dados local (agenda)

Se existiam agendamentos em `localStorage` (`vetflow:agenda:appointments`), eles **não** são migrados automaticamente. Recrie os agendamentos na UI ou importe manualmente no SQL.
