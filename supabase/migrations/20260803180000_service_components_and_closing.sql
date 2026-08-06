-- Composição de insumos (BOM) de serviços + snapshot de consumo na venda
-- e campos para separar custo de produto vs repasse a prestador (modelo 50/50).

CREATE TABLE IF NOT EXISTS public.service_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id text NOT NULL REFERENCES public.catalog_items(id) ON DELETE CASCADE,
  product_id text NOT NULL REFERENCES public.catalog_items(id) ON DELETE RESTRICT,
  quantity numeric(12, 3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (service_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_service_components_service
  ON public.service_components (service_id);

COMMENT ON TABLE public.service_components IS
  'Insumos de um serviço (ex.: Fluidoterapia = soro + equipo + cateter)';

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS product_cost numeric(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS provider_cost numeric(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sale_items.product_cost IS
  'Custo de produtos/insumos desta linha (para divisão 50/50)';
COMMENT ON COLUMN public.sale_items.provider_cost IS
  'Custo de repasse a prestador nesta linha (lab/especialista)';

-- Backfill: se tinha cost_provider, trata o cost como repasse; senão como produto
UPDATE public.sale_items
SET
  provider_cost = CASE
    WHEN cost_provider IS NOT NULL AND btrim(cost_provider) <> '' THEN COALESCE(cost, 0)
    ELSE 0
  END,
  product_cost = CASE
    WHEN cost_provider IS NOT NULL AND btrim(cost_provider) <> '' THEN 0
    ELSE COALESCE(cost, 0)
  END
WHERE COALESCE(product_cost, 0) = 0
  AND COALESCE(provider_cost, 0) = 0
  AND COALESCE(cost, 0) > 0;

CREATE TABLE IF NOT EXISTS public.sale_item_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id text NOT NULL,
  sale_item_id text NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity numeric(12, 3) NOT NULL CHECK (quantity > 0),
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sale_item_consumptions_sale
  ON public.sale_item_consumptions (sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_item_consumptions_item
  ON public.sale_item_consumptions (sale_item_id);

COMMENT ON TABLE public.sale_item_consumptions IS
  'Snapshot dos insumos baixados na venda (para estorno e relatório 50/50)';

ALTER TABLE public.service_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_item_consumptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_components' AND policyname = 'service_components_allow_all'
  ) THEN
    CREATE POLICY service_components_allow_all
      ON public.service_components FOR ALL
      USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'sale_item_consumptions' AND policyname = 'sale_item_consumptions_allow_all'
  ) THEN
    CREATE POLICY sale_item_consumptions_allow_all
      ON public.sale_item_consumptions FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
