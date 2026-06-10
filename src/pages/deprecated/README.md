# Páginas deprecadas / órfãs

Estes arquivos **não** são importados por `App.tsx`. Foram mantidos apenas como referência histórica.

| Arquivo | Motivo |
|---------|--------|
| `POSPage.tsx` | Duplicata de `sales/POSPage.tsx` (rota ativa) |
| `SalesPage.tsx` | Duplicata de `sales/SalesPage.tsx` |
| `sales/CashMovementsPage.tsx` | Rota redireciona para `/financial` |
| `sales/ConsultSalesPage.tsx` | Rota redireciona para `/sales/my-sales` |
| `sales/PriceListPage.tsx` | Rota redireciona para `/stock/products-services` |
| `sales/ClientRankingPage.tsx` | Rota redireciona para `/sales/client-financial` |
| `sales/ClientBalancePage.tsx` | Idem |
| `sales/BudgetModelPage.tsx` | Sem rota no menu |
| `sales/SalesConfigurationPage.tsx` | Sem rota |
| `sales/PaymentMethodsPage.tsx` | Rota usa `financial/PaymentMethodsPage` |
| `financial/AccountsReceivablePage.tsx` | Rota redireciona para `/financial` |
| `financial/CashMovementsPage.tsx` | Idem |
| `financial/ReceiptsHistoryPage.tsx` | Sem rota ativa |

**Remoção:** após confirmar que não há links externos, pode-se apagar esta pasta.
