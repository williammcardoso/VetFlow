-- VetFlow: settings (empresa/usuário) e schedules (agenda operacional)
-- Execute no SQL Editor do Supabase ou via `supabase db push`.
-- updated_at pode ser atualizado pelo app nas operações de upsert/update.

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  key text PRIMARY KEY CHECK (key IN ('company', 'user')),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_allow_all_anon" ON public.settings;
CREATE POLICY "settings_allow_all_anon"
  ON public.settings
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- schedules (agenda — separado de appointments clínicos)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedules (
  id text PRIMARY KEY,
  date date NOT NULL,
  time text NOT NULL,
  title text NOT NULL,
  client_id text,
  client_name text,
  animal_id text,
  animal_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules (date);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_allow_all_anon" ON public.schedules;
CREATE POLICY "schedules_allow_all_anon"
  ON public.schedules
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
