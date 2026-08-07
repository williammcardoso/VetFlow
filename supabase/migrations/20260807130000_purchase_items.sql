-- Itens de cada compra de estoque (Almoxarifado), estruturados — hoje só
-- existiam como texto dentro de financial_transactions.description (ex.:
-- "Seringa 3mL x20, Agulha x50"), tudo numa linha só, sem custo por item.
-- Isso impedia mostrar/imprimir cada produto com sua quantidade e valor
-- isolados. Sem FK pra financial_transactions.id de propósito (a tabela base
-- não foi criada por migration nesse projeto — mesmo padrão já usado em
-- sale_item_consumptions.sale_id).

CREATE TABLE IF NOT EXISTS public.purchase_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id text NOT NULL,
  product_id text,
  product_name text NOT NULL,
  quantity numeric(12, 3) NOT NULL,
  unit_cost numeric(12, 2) NOT NULL DEFAULT 0,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_transaction
  ON public.purchase_items (transaction_id);

COMMENT ON TABLE public.purchase_items IS
  'Itens (produto/quantidade/custo) de uma compra de estoque do Almoxarifado — permite detalhar e imprimir cada compra item a item.';

ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'purchase_items' AND policyname = 'purchase_items_allow_all'
  ) THEN
    CREATE POLICY purchase_items_allow_all
      ON public.purchase_items FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;
