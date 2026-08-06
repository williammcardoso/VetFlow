-- Snapshot travado do Fechamento Mensal 50/50: até aqui o resultado do mês era
-- só calculado em tempo real (nada gravado), então se um sale_item fosse
-- corrigido depois, o número "já fechado" mudava sozinho na próxima abertura
-- da tela. Esta tabela grava o snapshot no momento em que o mês é fechado.

CREATE TABLE IF NOT EXISTS public.monthly_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  sales_count int NOT NULL DEFAULT 0,
  bruto numeric(12, 2) NOT NULL DEFAULT 0,
  custo_produtos numeric(12, 2) NOT NULL DEFAULT 0,
  custo_repasses numeric(12, 2) NOT NULL DEFAULT 0,
  taxas_cartao numeric(12, 2) NOT NULL DEFAULT 0,
  lucro_liquido numeric(12, 2) NOT NULL DEFAULT 0,
  metade_clinica numeric(12, 2) NOT NULL DEFAULT 0,
  metade_agro numeric(12, 2) NOT NULL DEFAULT 0,
  closed_by text,
  closed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, month)
);

COMMENT ON TABLE public.monthly_closings IS
  'Snapshot travado do fechamento 50/50 de um mês. Ao existir uma linha, a tela de Fechamento passa a exibir estes valores congelados em vez de recalcular ao vivo.';

ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'monthly_closings' AND policyname = 'monthly_closings_allow_all'
  ) THEN
    CREATE POLICY monthly_closings_allow_all
      ON public.monthly_closings FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
