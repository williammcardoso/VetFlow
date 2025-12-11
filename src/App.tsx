import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientFormPage from "./pages/ClientFormPage"; // Importar a nova página de formulário
import AddAnimalPage from "./pages/AddAnimalPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import PatientRecordPage from "./pages/PatientRecordPage";
import AddExamPage from "./pages/AddExamPage";
import AddPrescriptionPage from "./pages/AddPrescriptionPage";
import AddAppointmentPage from "./pages/AddAppointmentPage"; // Importar a nova página de atendimento
import AppointmentViewPage from "./pages/AppointmentViewPage"; // Importar a nova página de visualização de atendimento
import SpeciesPage from "./pages/registrations/SpeciesPage";
import BreedsPage from "./pages/registrations/BreedsPage";
import CoatTypesPage from "./pages/registrations/CoatTypesPage";
import ExamReferencesPage from "./pages/registrations/ExamReferencesPage";
import CompanySettingsPage from "./pages/settings/CompanySettingsPage";
import UserSettingsPage from "./pages/settings/UserSettingsPage";
import AgendaPage from "./pages/AgendaPage";
import FinancialPage from "./pages/FinancialPage";
import NotFound from "./pages/NotFound";
import { ThemeProvider } from "./components/ThemeProvider";

// Sales Pages
import SalesPage from "./pages/sales/SalesPage";
import POSPage from "./pages/sales/POSPage";
import CashMovementsPage from "./pages/sales/CashMovementsPage";
import ConsultSalesPage from "./pages/sales/ConsultSalesPage";
import SoldPackagesPage from "./pages/sales/SoldPackagesPage";
import ReceiptsPage from "./pages/sales/ReceiptsPage";
import PriceListPage from "./pages/sales/PriceListPage";
import ClientRankingPage from "./pages/sales/ClientRankingPage";
import ClientBalancePage from "./pages/sales/ClientBalancePage";
import PaymentMethodsPage from "./pages/sales/PaymentMethodsPage";
import BudgetModelPage from "./pages/sales/BudgetModelPage";
import StatementModelPage from "./pages/sales/StatementModelPage";
import SalesConfigurationPage from "./pages/sales/SalesConfigurationPage";

// Financial Sub-pages
import TransactionsPage from "./pages/financial/TransactionsPage";
import CardReconciliationPage from "./pages/financial/CardReconciliationPage";
import AccountsPayablePage from "./pages/financial/AccountsPayablePage";
import StatementFinancialPage from "./pages/financial/StatementPage"; // Renomeado para evitar conflito
import CashFlowPage from "./pages/financial/CashFlowPage";
import AccountsCardsPage from "./pages/financial/AccountsCardsPage";
import CategoriesPage from "./pages/financial/CategoriesPage";
import SuppliersPage from "./pages/financial/SuppliersPage";
import FinancialPaymentMethodsPage from "./pages/financial/PaymentMethodsPage"; // Renomeado para evitar conflito

// ADDED: Stock pages
import ProductsServicesPage from "./pages/stock/ProductsServicesPage";
import PurchasesPage from "./pages/stock/PurchasesPage";
import OtherExitsPage from "./pages/stock/OtherExitsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/add" element={<ClientFormPage />} /> {/* Rota para adicionar cliente */}
              <Route path="/clients/:clientId/edit" element={<ClientFormPage />} /> {/* Nova rota para editar cliente */}
              <Route path="/animals/add" element={<AddAnimalPage />} />
              <Route path="/clients/:clientId" element={<ClientDetailPage />} />
              <Route path="/clients/:clientId/animals/:animalId/record" element={<PatientRecordPage />} />
              <Route path="/clients/:clientId/animals/:animalId/add-exam" element={<AddExamPage />} />
              <Route path="/clients/:clientId/animals/:animalId/edit-exam/:examId" element={<AddExamPage />} /> {/* Nova rota para editar exame */}
              <Route path="/clients/:clientId/animals/:animalId/edit" element={<AddAnimalPage />} /> {/* Nova rota para editar animal */}
              <Route path="/clients/:clientId/animals/:animalId/add-prescription" element={<AddPrescriptionPage />} />
              <Route path="/clients/:clientId/animals/:animalId/edit-prescription/:prescriptionId" element={<AddPrescriptionPage />} />
              {/* Novas rotas para adicionar/editar atendimento */}
              <Route path="/clients/:clientId/animals/:animalId/add-appointment" element={<AddAppointmentPage />} />
              <Route path="/clients/:clientId/animals/:animalId/edit-appointment/:appointmentId" element={<AddAppointmentPage />} />
              <Route path="/clients/:clientId/animals/:animalId/view-appointment/:appointmentId" element={<AppointmentViewPage />} /> {/* Nova rota para visualizar atendimento */}
              <Route path="/registrations/species" element={<SpeciesPage />} />
              <Route path="/registrations/breeds" element={<BreedsPage />} />
              <Route path="/registrations/coat-types" element={<CoatTypesPage />} />
              <Route path="/registrations/exam-references" element={<ExamReferencesPage />} />
              <Route path="/settings/company" element={<CompanySettingsPage />} />
              <Route path="/settings/user" element={<UserSettingsPage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              
              {/* Rotas do Módulo de Vendas */}
              <Route path="/sales/pos" element={<POSPage />} />
              <Route path="/sales/my-sales" element={<SalesPage />} />
              <Route path="/sales/cash-movements" element={<CashMovementsPage />} />
              <Route path="/sales/consult-sales" element={<ConsultSalesPage />} />
              <Route path="/sales/sold-packages" element={<SoldPackagesPage />} />
              <Route path="/sales/receipts" element={<ReceiptsPage />} />
              <Route path="/sales/price-list" element={<PriceListPage />} />
              <Route path="/sales/client-ranking" element={<ClientRankingPage />} />
              <Route path="/sales/client-balance" element={<ClientBalancePage />} />
              <Route path="/sales/payment-methods" element={<PaymentMethodsPage />} />
              <Route path="/sales/budget-model" element={<BudgetModelPage />} />
              <Route path="/sales/statement-model" element={<StatementModelPage />} />
              <Route path="/sales/configuration" element={<SalesConfigurationPage />} />

              {/* Rotas do Módulo Financeiro */}
              <Route path="/financial" element={<FinancialPage />} />
              <Route path="/financial/transactions" element={<TransactionsPage />} />
              <Route path="/financial/card-reconciliation" element={<CardReconciliationPage />} />
              <Route path="/financial/accounts-payable" element={<AccountsPayablePage />} />
              <Route path="/financial/statement" element={<StatementFinancialPage />} />
              <Route path="/financial/cash-flow" element={<CashFlowPage />} />
              <Route path="/financial/accounts-cards" element={<AccountsCardsPage />} />
              <Route path="/financial/categories" element={<CategoriesPage />} />
              <Route path="/financial/suppliers" element={<SuppliersPage />} />
              <Route path="/financial/payment-methods" element={<FinancialPaymentMethodsPage />} />

              {/* Estoque e Serviços */}
              <Route path="/stock/products-services" element={<ProductsServicesPage />} />
              <Route path="/stock/purchases" element={<PurchasesPage />} />
              <Route path="/stock/other-exits" element={<OtherExitsPage />} />

              {/* ADICIONE TODAS AS ROTAS PERSONALIZADAS ACIMA DA ROTA CATCH-ALL "*" */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;