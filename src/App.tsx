import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import ClientsPage from "./pages/ClientsPage";
import ClientFormPage from "./pages/ClientFormPage";
import AddAnimalPage from "./pages/AddAnimalPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import PatientRecordPage from "./pages/PatientRecordPage";
import AddExamPage from "./pages/AddExamPage";
import AddPrescriptionPage from "./pages/AddPrescriptionPage";
import AddDocumentPage from "./pages/AddDocumentPage";
import AddAppointmentPage from "./pages/AddAppointmentPage";
import AppointmentViewPage from "./pages/AppointmentViewPage";
import SpeciesPage from "./pages/registrations/SpeciesPage";
import BreedsPage from "./pages/registrations/BreedsPage";
import CoatTypesPage from "./pages/registrations/CoatTypesPage";
import ExamReferencesPage from "./pages/registrations/ExamReferencesPage";
import PathologiesPage from "./pages/registrations/PathologiesPage";
import ExamAttributesPage from "./pages/registrations/ExamAttributesPage";
import ClientOriginsPage from "./pages/registrations/ClientOriginsPage";
import RecipeModelPage from "./pages/registrations/RecipeModelPage";
import CompanySettingsPage from "./pages/settings/CompanySettingsPage";
import UserSettingsPage from "./pages/settings/UserSettingsPage";
import AppointmentTypesPage from "./pages/registrations/AppointmentTypesPage";
import VaccinesPage from "./pages/registrations/VaccinesPage";
import ExamsPage from "./pages/registrations/ExamsPage";
import DocumentModelPage from "./pages/registrations/DocumentModelPage";
import AgendaPage from "./pages/AgendaPage";
import FinancialPage from "./pages/FinancialPage";
import NotFound from "./pages/NotFound";
import HelpPage from "./pages/HelpPage";
import { ThemeProvider } from "./components/ThemeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoginPage from "./pages/auth/LoginPage";
import UsersManagementPage from "./pages/settings/UsersManagementPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Sales Pages
import SalesPage from "./pages/sales/SalesPage";
import POSPage from "./pages/sales/POSPage";
import SoldPackagesPage from "./pages/sales/SoldPackagesPage";
import ReceiptsPage from "./pages/sales/ReceiptsPage";
import BudgetsPage from "./pages/sales/BudgetsPage";
import StatementModelPage from "./pages/sales/StatementModelPage";
import SalesReportsPage from "./pages/sales/SalesReportsPage";
import ClientFinancialPage from "./pages/sales/ClientFinancialPage";

// Financial Sub-pages
import TransactionsPage from "./pages/financial/TransactionsPage";
import CardReconciliationPage from "./pages/financial/CardReconciliationPage";
import AccountsPayablePage from "./pages/financial/AccountsPayablePage";
import StatementFinancialPage from "./pages/financial/StatementPage";
import CashFlowPage from "./pages/financial/CashFlowPage";
import AccountsCardsPage from "./pages/financial/AccountsCardsPage";
import CategoriesPage from "./pages/financial/CategoriesPage";
import SuppliersPage from "./pages/financial/SuppliersPage";
import FinancialPaymentMethodsPage from "./pages/financial/PaymentMethodsPage";
import FinancialReportsPage from "./pages/financial/FinancialReportsPage";

// Stock pages
import ProductsServicesPage from "./pages/stock/ProductsServicesPage";
import PurchasesPage from "./pages/stock/PurchasesPage";
import OtherExitsPage from "./pages/stock/OtherExitsPage";
import StockAnalysisPage from "./pages/stock/StockAnalysisPage";
import InventoryPage from "./pages/stock/InventoryPage";
import PurchaseOrderPage from "./pages/stock/PurchaseOrderPage";
import ProductGroupsPage from "./pages/stock/ProductGroupsPage";
import BrandsPage from "./pages/stock/BrandsPage";
import RecommendedProductsPage from "./pages/stock/RecommendedProductsPage";

// Settings
import ExternalAccessPage from "./pages/settings/ExternalAccessPage";
import AccessProfilePage from "./pages/settings/AccessProfilePage";
import AppearanceSettingsPage from "./pages/settings/AppearanceSettingsPage";
import { getCompanySettings } from "./lib/settingsApi";

const queryClient = new QueryClient();

const ProtectedAppShell = () => {
  const { isAuthenticated, permissionsLoading, canAccessPath, canAccessModule } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) return;
    void getCompanySettings().catch(() => undefined);
  }, [isAuthenticated]);

  if (isAuthenticated && !permissionsLoading && !canAccessPath(location.pathname, "view")) {
    const fallback = canAccessModule("dashboard", "view")
      ? "/dashboard"
      : canAccessModule("clients", "view")
        ? "/clients"
        : canAccessModule("agenda", "view")
          ? "/agenda"
          : "/help";
    return <Navigate to={fallback} replace />;
  }

  return (
    <ProtectedRoute>
      <Layout>
        <Outlet />
      </Layout>
    </ProtectedRoute>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" storageKey="vite-ui-theme">
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />

                  <Route element={<ProtectedAppShell />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/add" element={<ClientFormPage />} />
                    <Route path="/clients/:clientId/edit" element={<ClientFormPage />} />
                    <Route path="/animals/add" element={<AddAnimalPage />} />
                    <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/record" element={<PatientRecordPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/add-exam" element={<AddExamPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/edit-exam/:examId" element={<AddExamPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/edit" element={<AddAnimalPage />} />
                    <Route
                      path="/clients/:clientId/animals/:animalId/add-prescription"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients/:clientId/animals/:animalId/edit-prescription/:prescriptionId"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/clients/:clientId/animals/:animalId/add-appointment" element={<AddAppointmentPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/edit-appointment/:appointmentId" element={<AddAppointmentPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/view-appointment/:appointmentId" element={<AppointmentViewPage />} />
                    <Route
                      path="/clients/:clientId/animals/:animalId/add-document"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddDocumentPage />
                        </ProtectedRoute>
                      }
                    />

                    {/* Cadastros */}
                    <Route path="/registrations/species" element={<SpeciesPage />} />
                    <Route path="/registrations/breeds" element={<BreedsPage />} />
                    <Route path="/registrations/coat-types" element={<CoatTypesPage />} />
                    <Route path="/registrations/exam-references" element={<ExamReferencesPage />} />
                    <Route path="/registrations/pathologies" element={<PathologiesPage />} />
                    <Route path="/registrations/exam-attributes" element={<ExamAttributesPage />} />
                    <Route path="/registrations/client-origins" element={<ClientOriginsPage />} />
                    <Route path="/registrations/recipe-model" element={<RecipeModelPage />} />
                    <Route path="/registrations/appointment-types" element={<AppointmentTypesPage />} />
                    <Route path="/registrations/vaccines" element={<VaccinesPage />} />
                    <Route path="/registrations/exams" element={<ExamsPage />} />
                    <Route path="/registrations/document-model" element={<DocumentModelPage />} />

                    {/* Configurações */}
                    <Route
                      path="/settings/company"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <CompanySettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/settings/user" element={<UserSettingsPage />} />
                    <Route
                      path="/settings/users-management"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <UsersManagementPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/settings/appearance" element={<AppearanceSettingsPage />} />
                    <Route
                      path="/settings/external-access"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <ExternalAccessPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/access-profile"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <AccessProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/agenda" element={<AgendaPage />} />
                    <Route path="/help" element={<HelpPage />} />

                    {/* Vendas */}
                    <Route path="/sales/pos" element={<POSPage />} />
                    <Route path="/sales/my-sales" element={<SalesPage />} />
                    <Route path="/sales/reports" element={<SalesReportsPage />} />
                    <Route path="/sales/budgets" element={<BudgetsPage />} />
                    <Route path="/sales/receipts" element={<ReceiptsPage />} />
                    <Route path="/sales/sold-packages" element={<SoldPackagesPage />} />
                    <Route path="/sales/statement-model" element={<StatementModelPage />} />
                    <Route path="/sales/client-financial" element={<ClientFinancialPage />} />

                    {/* Redirects de compatibilidade */}
                    <Route path="/sales/consult-sales" element={<Navigate to="/sales/my-sales" replace />} />
                    <Route path="/sales/cash-movements" element={<Navigate to="/financial" replace />} />
                    <Route path="/sales/payment-methods" element={<Navigate to="/financial/payment-methods" replace />} />
                    <Route path="/sales/price-list" element={<Navigate to="/stock/products-services" replace />} />
                    <Route path="/sales/client-ranking" element={<Navigate to="/sales/client-financial" replace />} />
                    <Route path="/sales/client-balance" element={<Navigate to="/sales/client-financial" replace />} />

                    {/* Financeiro */}
                    <Route path="/financial" element={<FinancialPage />} />
                    <Route path="/financial/reports" element={<FinancialReportsPage />} />
                    <Route path="/financial/accounts-receivable" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/receipts" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/cash-movements" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/transactions" element={<TransactionsPage />} />
                    <Route path="/financial/card-reconciliation" element={<CardReconciliationPage />} />
                    <Route path="/financial/accounts-payable" element={<AccountsPayablePage />} />
                    <Route path="/financial/statement" element={<StatementFinancialPage />} />
                    <Route path="/financial/cash-flow" element={<CashFlowPage />} />
                    <Route path="/financial/accounts-cards" element={<AccountsCardsPage />} />
                    <Route path="/financial/categories" element={<CategoriesPage />} />
                    <Route path="/financial/suppliers" element={<SuppliersPage />} />
                    <Route path="/financial/payment-methods" element={<FinancialPaymentMethodsPage />} />

                    {/* Estoque */}
                    <Route path="/stock/products-services" element={<ProductsServicesPage />} />
                    <Route path="/stock/purchases" element={<PurchasesPage />} />
                    <Route path="/stock/other-exits" element={<OtherExitsPage />} />
                    <Route path="/stock/stock-analysis" element={<StockAnalysisPage />} />
                    <Route path="/stock/inventory" element={<InventoryPage />} />
                    <Route path="/stock/purchase-order" element={<PurchaseOrderPage />} />
                    <Route path="/stock/product-groups" element={<ProductGroupsPage />} />
                    <Route path="/stock/brands" element={<BrandsPage />} />
                    <Route path="/stock/recommended-products" element={<RecommendedProductsPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
