-- VetFlow: status operacional para agenda
ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'scheduled'
CHECK (status IN ('scheduled', 'in_progress', 'attended', 'no_show', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules (status);
