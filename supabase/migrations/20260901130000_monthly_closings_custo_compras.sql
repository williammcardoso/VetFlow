-- Coluna faltando desde que o modelo virou "Agropecuária como almoxarifado"
-- (2026-08-07): monthlyClosing.ts calcula custoCompras (Lista de Compras do
-- mês), mas monthly_closings nunca ganhou a coluna pra guardar esse valor —
-- closeMonth() nem tentava gravar, rowToRecord() nem tentava ler. Resultado:
-- todo mês fechado desde então mostra "(−) Compras de estoque (Almoxarifado)"
-- como "R$ NaN" na tela (lucro líquido total continua certo, porque esse foi
-- calculado e gravado corretamente ANTES do insert — só a linha individual
-- de compras é que nunca tinha onde ser salva).

ALTER TABLE public.monthly_closings
  ADD COLUMN IF NOT EXISTS custo_compras numeric(12, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.monthly_closings.custo_compras IS
  'Custo de insumos retirados do almoxarifado no mês (Estoque > Compras) — parte da fórmula do lucro líquido desde 2026-08-07.';

-- Conserta qualquer mês já fechado antes desta migration (ex.: agosto/2026):
-- lucro_liquido foi calculado e gravado CERTO no momento do fechamento
-- (a coluna só não existia pra guardar a parcela de compras separada) —
-- então dá pra recuperar o valor exato de volta, isolando-o da própria
-- fórmula, em vez de chutar ou zerar. Só mexe em linha que ainda está no
-- default 0 (recém-criada pelo ALTER acima) — não sobrescreve nada gravado
-- de verdade por um fechamento feito depois desta migration.
UPDATE public.monthly_closings
SET custo_compras = bruto - custo_produtos - custo_repasses - taxas_cartao - lucro_liquido
WHERE custo_compras = 0
  AND (bruto - custo_produtos - custo_repasses - taxas_cartao - lucro_liquido) > 0;
