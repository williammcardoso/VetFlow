import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import ClientsPage from "./pages/ClientsPage";
import ClientFormPage from "./pages/ClientFormPage";
import AddAnimalPage from "./pages/AddAnimalPage";
import ClientDetailPage from "./pages/ClientDetailPage";
import PatientRecordPage from "./pages/PatientRecordPage";
import AddExamPage from "./pages/AddExamPage";
import AddPrescriptionPage from "./pages/AddPrescriptionPage";
import AddDocumentPage from "./pages/AddDocumentPage";
import EmitDocumentPage from "./pages/EmitDocumentPage";
import AddExamRequestPage from "./pages/AddExamRequestPage";
import AddAppointmentPage from "./pages/AddAppointmentPage";
import AppointmentViewPage from "./pages/AppointmentViewPage";
import SpeciesPage from "./pages/registrations/SpeciesPage";
import BreedsPage from "./pages/registrations/BreedsPage";
import CoatTypesPage from "./pages/registrations/CoatTypesPage";
import ExamReferencesPage from "./pages/registrations/ExamReferencesPage";
import CompanySettingsPage from "./pages/settings/CompanySettingsPage";
import AgendaAvailabilityPage from "./pages/settings/AgendaAvailabilityPage";
import UserSettingsPage from "./pages/settings/UserSettingsPage";
import AppointmentTypesPage from "./pages/registrations/AppointmentTypesPage";
import VaccinesPage from "./pages/registrations/VaccinesPage";
import ExamsPage from "./pages/registrations/ExamsPage";
import DocumentModelPage from "./pages/registrations/DocumentModelPage";
import DocumentLibraryPage from "./pages/registrations/DocumentLibraryPage";
import DocumentTemplateEditorPage from "./pages/registrations/DocumentTemplateEditorPage";
import AgendaPage from "./pages/AgendaPage";
import FinancialPage from "./pages/FinancialPage";
import NotFound from "./pages/NotFound";
import HelpPage from "./pages/HelpPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoginPage from "./pages/auth/LoginPage";
import ValidateDocumentPage from "./pages/public/ValidateDocumentPage";
import SignDocumentPage from "./pages/public/SignDocumentPage";
import BookSchedulePage from "./pages/public/BookSchedulePage";
import UsersManagementPage from "./pages/settings/UsersManagementPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Sales Pages
import SalesPage from "./pages/sales/SalesPage";
import POSPage from "./pages/sales/POSPage";
import ReceiptsPage from "./pages/sales/ReceiptsPage";
import BudgetsPage from "./pages/sales/BudgetsPage";
import SalesReportsPage from "./pages/sales/SalesReportsPage";
import ClientFinancialPage from "./pages/sales/ClientFinancialPage";
import PriceListPage from "./pages/sales/PriceListPage";

// Clinical pages
import ReturnsForecastPage from "./pages/clinical/ReturnsForecastPage";
import AppointmentsReportPage from "./pages/clinical/AppointmentsReportPage";

// Financial Sub-pages
import FinancialPaymentMethodsPage from "./pages/financial/PaymentMethodsPage";
import FinancialReportsPage from "./pages/financial/FinancialReportsPage";
import MonthlyClosingPage from "./pages/financial/MonthlyClosingPage";

// Stock pages
import ProductsServicesPage from "./pages/stock/ProductsServicesPage";
import PurchasesPage from "./pages/stock/PurchasesPage";

// Settings
import AccessProfilePage from "./pages/settings/AccessProfilePage";
import AppearanceSettingsPage from "./pages/settings/AppearanceSettingsPage";
import { getCompanySettings } from "./lib/settingsApi";

const queryClient = new QueryClient();

// React Router reaproveita a mesma instância de PatientRecordPage ao navegar
// entre prontuários diferentes (só os params da rota mudam) — como o arquivo
// tem várias listas em estado local (timeline, exames, receitas, peso,
// documentos), dados do paciente anterior podiam ficar visíveis até as
// buscas do paciente novo voltarem. `key` força o React a desmontar e
// remontar do zero a cada troca de paciente, o jeito mais seguro de garantir
// que nenhum estado sobra de um prontuário pro outro.
const PatientRecordRoute = () => {
  const { clientId, animalId, patientCode } = useParams<{ clientId?: string; animalId?: string; patientCode?: string }>();
  const key = patientCode || animalId || clientId || "new";
  return <PatientRecordPage key={key} />;
};

// Mesma proteção do PatientRecordRoute acima, só que genérica pras telas
// "de baixo" do prontuário (editar/adicionar atendimento, exame, receita,
// documento, etc.) — cada uma tem seu próprio param de entidade
// (appointmentId/examId/...), então a key usa todos os params da rota
// batida (o que muda entre "editar item A" e "editar item B", ou entre
// pacientes diferentes, sempre muda a key e força remount).
function makeKeyedPatientRoute(Component: React.ComponentType) {
  return function KeyedPatientRoute() {
    const params = useParams();
    const key = Object.values(params).filter(Boolean).join("|") || "new";
    return <Component key={key} />;
  };
}

const AddExamRoute = makeKeyedPatientRoute(AddExamPage);
const AddAnimalEditRoute = makeKeyedPatientRoute(AddAnimalPage);
const AddPrescriptionRoute = makeKeyedPatientRoute(AddPrescriptionPage);
const AddAppointmentRoute = makeKeyedPatientRoute(AddAppointmentPage);
const AppointmentViewRoute = makeKeyedPatientRoute(AppointmentViewPage);
const AddDocumentRoute = makeKeyedPatientRoute(AddDocumentPage);
const AddExamRequestRoute = makeKeyedPatientRoute(AddExamRequestPage);
const EmitDocumentRoute = makeKeyedPatientRoute(EmitDocumentPage);

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
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/validar/:hash" element={<ValidateDocumentPage />} />
                <Route path="/assinar/:documentId" element={<SignDocumentPage />} />
                <Route path="/agendar-horario" element={<BookSchedulePage />} />

                  <Route element={<ProtectedAppShell />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/clients" element={<ClientsPage />} />
                    <Route path="/clients/add" element={<ClientFormPage />} />
                    <Route path="/clients/:clientId/edit" element={<ClientFormPage />} />
                    <Route path="/animals/add" element={<AddAnimalPage />} />
                    <Route path="/clients/:clientId" element={<ClientDetailPage />} />
                    <Route path="/clients/:clientId/animals/:animalId/record" element={<PatientRecordRoute />} />
                    <Route path="/prontuario/:patientCode" element={<PatientRecordRoute />} />

                    {/* Telas "de baixo" do prontuário — rota longa (2 UUIDs) mantida por
                        compatibilidade com link antigo/favorito, e rota curta
                        (/prontuario/:patientCode/...) nova, mesmo padrão da URL curta do
                        prontuário em si. */}
                    <Route path="/clients/:clientId/animals/:animalId/add-exam" element={<AddExamRoute />} />
                    <Route path="/prontuario/:patientCode/add-exam" element={<AddExamRoute />} />
                    <Route path="/clients/:clientId/animals/:animalId/edit-exam/:examId" element={<AddExamRoute />} />
                    <Route path="/prontuario/:patientCode/edit-exam/:examId" element={<AddExamRoute />} />

                    <Route path="/clients/:clientId/animals/:animalId/edit" element={<AddAnimalEditRoute />} />
                    <Route path="/prontuario/:patientCode/edit" element={<AddAnimalEditRoute />} />

                    <Route
                      path="/clients/:clientId/animals/:animalId/add-prescription"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/prontuario/:patientCode/add-prescription"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients/:clientId/animals/:animalId/edit-prescription/:prescriptionId"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/prontuario/:patientCode/edit-prescription/:prescriptionId"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddPrescriptionRoute />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/clients/:clientId/animals/:animalId/add-appointment" element={<AddAppointmentRoute />} />
                    <Route path="/prontuario/:patientCode/add-appointment" element={<AddAppointmentRoute />} />
                    <Route path="/clients/:clientId/animals/:animalId/edit-appointment/:appointmentId" element={<AddAppointmentRoute />} />
                    <Route path="/prontuario/:patientCode/edit-appointment/:appointmentId" element={<AddAppointmentRoute />} />
                    <Route path="/clients/:clientId/animals/:animalId/view-appointment/:appointmentId" element={<AppointmentViewRoute />} />
                    <Route path="/prontuario/:patientCode/view-appointment/:appointmentId" element={<AppointmentViewRoute />} />

                    <Route
                      path="/clients/:clientId/animals/:animalId/add-document"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddDocumentRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/prontuario/:patientCode/add-document"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddDocumentRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients/:clientId/animals/:animalId/add-exam-request"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddExamRequestRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/prontuario/:patientCode/add-exam-request"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <AddExamRequestRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/clients/:clientId/animals/:animalId/emit-document"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <EmitDocumentRoute />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/prontuario/:patientCode/emit-document"
                      element={
                        <ProtectedRoute requireModule="prescriptions" requireAction="edit">
                          <EmitDocumentRoute />
                        </ProtectedRoute>
                      }
                    />

                    {/* Cadastros */}
                    <Route path="/registrations/species" element={<SpeciesPage />} />
                    <Route path="/registrations/breeds" element={<BreedsPage />} />
                    <Route path="/registrations/coat-types" element={<CoatTypesPage />} />
                    <Route path="/registrations/exam-references" element={<ExamReferencesPage />} />
                    <Route path="/registrations/appointment-types" element={<AppointmentTypesPage />} />
                    <Route path="/registrations/vaccines" element={<VaccinesPage />} />
                    <Route path="/registrations/exams" element={<ExamsPage />} />
                    <Route path="/registrations/document-model" element={<DocumentModelPage />} />
                    <Route path="/registrations/document-library" element={<DocumentLibraryPage />} />
                    <Route path="/registrations/document-library/:codigo/edit" element={<DocumentTemplateEditorPage />} />

                    {/* Configurações */}
                    <Route
                      path="/settings/company"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <CompanySettingsPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/settings/agenda-availability"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <AgendaAvailabilityPage />
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
                      path="/settings/access-profile"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <AccessProfilePage />
                        </ProtectedRoute>
                      }
                    />

                    <Route path="/agenda" element={<AgendaPage />} />
                    <Route path="/clinical/returns-forecast" element={<ReturnsForecastPage />} />
                    <Route path="/clinical/appointments-report" element={<AppointmentsReportPage />} />
                    <Route path="/help" element={<HelpPage />} />

                    {/* Vendas */}
                    <Route path="/sales/pos" element={<POSPage />} />
                    <Route path="/sales/my-sales" element={<SalesPage />} />
                    <Route path="/sales/reports" element={<SalesReportsPage />} />
                    <Route path="/sales/budgets" element={<BudgetsPage />} />
                    <Route path="/sales/receipts" element={<ReceiptsPage />} />
                    <Route path="/sales/client-financial" element={<ClientFinancialPage />} />

                    {/* Redirects de compatibilidade */}
                    <Route path="/sales/consult-sales" element={<Navigate to="/sales/my-sales" replace />} />
                    <Route path="/sales/cash-movements" element={<Navigate to="/financial" replace />} />
                    <Route path="/sales/payment-methods" element={<Navigate to="/financial/payment-methods" replace />} />
                    <Route path="/sales/price-list" element={<PriceListPage />} />
                    <Route path="/sales/client-ranking" element={<Navigate to="/sales/client-financial" replace />} />
                    <Route path="/sales/client-balance" element={<Navigate to="/sales/client-financial" replace />} />

                    {/* Financeiro */}
                    <Route path="/financial" element={<FinancialPage />} />
                    <Route path="/financial/reports" element={<FinancialReportsPage />} />
                    <Route path="/financial/monthly-closing" element={<MonthlyClosingPage />} />
                    <Route path="/financial/accounts-receivable" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/receipts" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/cash-movements" element={<Navigate to="/financial" replace />} />
                    <Route path="/financial/payment-methods" element={<FinancialPaymentMethodsPage />} />

                    {/* Estoque */}
                    <Route path="/stock/products-services" element={<ProductsServicesPage />} />
                    <Route path="/stock/purchases" element={<PurchasesPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
