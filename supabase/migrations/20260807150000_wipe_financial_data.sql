-- ATENÇÃO: script de uso único, NÃO é uma migration de schema comum.
-- Apaga TODA a movimentação financeira real (vendas, recebimentos,
-- despesas/compras, estornos, orçamentos, fechamentos mensais) pra você
-- recomeçar a alimentar o sistema com dados reais a partir de hoje.
--
-- NÃO apaga: clients, animals (pets), exams, prescriptions,
-- patient_documents, appointments, schedules, patient_observations,
-- patient_weight_entries, catalog_items (estoque/custo atual ficam como
-- estão), app_users, settings, registry.
--
-- Isso é IRREVERSÍVEL. Antes de rodar, se possível, tire um backup/export
-- das tabelas abaixo no painel do Supabase. Rode o bloco inteiro de uma vez
-- no SQL Editor — está dentro de uma transação, então se alguma linha der
-- erro (ex.: uma tabela que não existe no seu projeto), nada é apagado e
-- você pode me mandar a mensagem de erro pra eu ajustar o script.

begin;

-- Filhos primeiro (itens/consumo de cada venda ou compra)
delete from public.sale_item_consumptions;
delete from public.sale_items;
delete from public.purchase_items;
delete from public.budget_items;
delete from public.purchase_order_items;

-- Depois os "pais"
delete from public.budgets;
delete from public.purchase_orders;
delete from public.monthly_closings;
delete from public.financial_transactions;

-- Estatísticas financeiras cacheadas no cadastro do pet (senão ficam
-- mostrando totais antigos sem nenhuma venda por trás)
update public.animals set total_procedures = 0, total_value = 0;

commit;
