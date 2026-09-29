import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { Suspense, useEffect } from "react";
import Layout from "./components/Layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getCompanySettings } from "./lib/settingsApi";
import { lazyPage } from "./lib/lazyPage";
import { PageLoading } from "./components/PageLoading";

// Telas carregadas sob demanda (ver lib/lazyPage.ts).
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const ClientsPage = lazyPage(() => import("./pages/ClientsPage"));
const ClientFormPage = lazyPage(() => import("./pages/ClientFormPage"));
const AddAnimalPage = lazyPage(() => import("./pages/AddAnimalPage"));
const ClientDetailPage = lazyPage(() => import("./pages/ClientDetailPage"));
const PatientRecordPage = lazyPage(() => import("./pages/PatientRecordPage"));
const AddExamPage = lazyPage(() => import("./pages/AddExamPage"));
const AddPrescriptionPage = lazyPage(() => import("./pages/AddPrescriptionPage"));
const AddDocumentPage = lazyPage(() => import("./pages/AddDocumentPage"));
const EmitDocumentPage = lazyPage(() => import("./pages/EmitDocumentPage"));
const AddExamRequestPage = lazyPage(() => import("./pages/AddExamRequestPage"));
const AddAppointmentPage = lazyPage(() => import("./pages/AddAppointmentPage"));
const AppointmentViewPage = lazyPage(() => import("./pages/AppointmentViewPage"));
const SpeciesPage = lazyPage(() => import("./pages/registrations/SpeciesPage"));
const BreedsPage = lazyPage(() => import("./pages/registrations/BreedsPage"));
const CoatTypesPage = lazyPage(() => import("./pages/registrations/CoatTypesPage"));
const ExamReferencesPage = lazyPage(() => import("./pages/registrations/ExamReferencesPage"));
const CompanySettingsPage = lazyPage(() => import("./pages/settings/CompanySettingsPage"));
const AgendaAvailabilityPage = lazyPage(() => import("./pages/settings/AgendaAvailabilityPage"));
const UserSettingsPage = lazyPage(() => import("./pages/settings/UserSettingsPage"));
const AppointmentTypesPage = lazyPage(() => import("./pages/registrations/AppointmentTypesPage"));
const VaccinesPage = lazyPage(() => import("./pages/registrations/VaccinesPage"));
const ExamsPage = lazyPage(() => import("./pages/registrations/ExamsPage"));
const DocumentModelPage = lazyPage(() => import("./pages/registrations/DocumentModelPage"));
const DocumentLibraryPage = lazyPage(() => import("./pages/registrations/DocumentLibraryPage"));
const DocumentTemplateEditorPage = lazyPage(() => import("./pages/registrations/DocumentTemplateEditorPage"));
const AgendaPage = lazyPage(() => import("./pages/AgendaPage"));
const FinancialPage = lazyPage(() => import("./pages/FinancialPage"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const HelpPage = lazyPage(() => import("./pages/HelpPage"));
const LoginPage = lazyPage(() => import("./pages/auth/LoginPage"));
const ValidateDocumentPage = lazyPage(() => import("./pages/public/ValidateDocumentPage"));
const SignDocumentPage = lazyPage(() => import("./pages/public/SignDocumentPage"));
const BookSchedulePage = lazyPage(() => import("./pages/public/BookSchedulePage"));
const DocumentRedirectPage = lazyPage(() => import("./pages/public/DocumentRedirectPage"));
const UsersManagementPage = lazyPage(() => import("./pages/settings/UsersManagementPage"));
const SalesPage = lazyPage(() => import("./pages/sales/SalesPage"));
const POSPage = lazyPage(() => import("./pages/sales/POSPage"));
const ReceiptsPage = lazyPage(() => import("./pages/sales/ReceiptsPage"));
const BudgetsPage = lazyPage(() => import("./pages/sales/BudgetsPage"));
const SalesReportsPage = lazyPage(() => import("./pages/sales/SalesReportsPage"));
const ClientFinancialPage = lazyPage(() => import("./pages/sales/ClientFinancialPage"));
const PriceListPage = lazyPage(() => import("./pages/sales/PriceListPage"));
const ReturnsForecastPage = lazyPage(() => import("./pages/clinical/ReturnsForecastPage"));
const AppointmentsReportPage = lazyPage(() => import("./pages/clinical/AppointmentsReportPage"));
const FinancialPaymentMethodsPage = lazyPage(() => import("./pages/financial/PaymentMethodsPage"));
const FinancialReportsPage = lazyPage(() => import("./pages/financial/FinancialReportsPage"));
const MonthlyClosingPage = lazyPage(() => import("./pages/financial/MonthlyClosingPage"));
const ProductsServicesPage = lazyPage(() => import("./pages/stock/ProductsServicesPage"));
const PurchasesPage = lazyPage(() => import("./pages/stock/PurchasesPage"));
const AccessProfilePage = lazyPage(() => import("./pages/settings/AccessProfilePage"));
const AppearanceSettingsPage = lazyPage(() => import("./pages/settings/AppearanceSettingsPage"));
const BackupPage = lazyPage(() => import("./pages/settings/BackupPage"));

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
        {/* O menu fica na tela enquanto a próxima tela é baixada. */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
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
              <Suspense fallback={<PageLoading fullScreen />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/validar/:hash" element={<ValidateDocumentPage />} />
                <Route path="/assinar/:documentId" element={<SignDocumentPage />} />
                <Route path="/agendar-horario" element={<BookSchedulePage />} />
                {/* Em produção o /d/:code é respondido pela função
                    api/share-link.ts (prévia do WhatsApp com título); esta
                    rota da SPA vale no `npm run dev` e como reserva:
                    /documento/:code é pra onde a função manda se não
                    conseguir resolver o link sozinha. */}
                <Route path="/d/:code" element={<DocumentRedirectPage />} />
                <Route path="/documento/:code" element={<DocumentRedirectPage />} />

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
                      path="/settings/backup"
                      element={
                        <ProtectedRoute requireRole="admin">
                          <BackupPage />
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
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
