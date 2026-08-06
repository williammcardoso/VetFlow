-- Prestador/destino do repasse (ex.: Cardiologista, Laboratório externo).
-- Separado da categoria do item: a categoria descreve o serviço;
-- cost_provider indica para quem o custo deve ser repassado.

ALTER TABLE public.catalog_items
  ADD COLUMN IF NOT EXISTS cost_provider text;

ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS cost_provider text;

COMMENT ON COLUMN public.catalog_items.cost_provider IS
  'Nome do prestador/fornecedor que recebe o repasse (ex.: Cardiologista, Lab externo)';

COMMENT ON COLUMN public.sale_items.cost_provider IS
  'Snapshot do prestador do repasse no momento da venda';

-- Itens antigos de exame externo sem prestador: assume laboratório
UPDATE public.catalog_items
SET cost_provider = 'Laboratório externo'
WHERE cost IS NOT NULL
  AND cost > 0
  AND category = 'exame_externo'
  AND (cost_provider IS NULL OR btrim(cost_provider) = '');
