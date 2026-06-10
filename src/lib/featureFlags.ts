/**
 * Feature flags for VetFlow.
 * Features set to `false` are hidden from the main navigation.
 * Routes still exist for direct access but are not shown in menus.
 * Toggle to `true` when a feature is ready for production.
 */
export const FEATURES = {
  SOLD_PACKAGES: false,
  BUDGET_MODEL: false,
  STATEMENT_MODEL: false,
  SALES_CONFIGURATION: false,

  FINANCIAL_TRANSACTIONS: false,
  CARD_RECONCILIATION: false,
  ACCOUNTS_PAYABLE: false,
  FINANCIAL_STATEMENT: false,
  CASH_FLOW: false,
  ACCOUNTS_CARDS: false,
  FINANCIAL_CATEGORIES: false,
  FINANCIAL_SUPPLIERS: false,

  STOCK_ANALYSIS: false,
  PURCHASE_ORDER: false,
  PRODUCT_GROUPS: false,
  STOCK_BRANDS: false,
  RECOMMENDED_PRODUCTS: false,

  SALES_REPORTS: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key] === true;
}
