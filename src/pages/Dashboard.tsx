import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaChartBar, FaCalendarAlt, FaChartLine, FaBox } from "react-icons/fa";
import { mockAppointments } from "@/pages/AddAppointmentPage";
import { getCatalog } from "@/mockData/catalog";

const Dashboard = () => {
  // Cálculos dinâmicos
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const appointmentsThisMonth = mockAppointments.filter(app => {
    const d = new Date(`${app.date}T${app.time || "00:00"}`);
    return d >= startOfMonth && d <= now;
  }).length;
  const last24hAppointments = mockAppointments.filter(app => {
    const d = new Date(`${app.date}T${app.time || "00:00"}`);
    return now.getTime() - d.getTime() <= 24 * 60 * 60 * 1000;
  }).length;
  const lowStockCount = getCatalog().filter(it => it.type === "product" && typeof it.stockQty === "number" && it.stockQty <= 5).length;

  return (
    <div className="p-6 bg-background">
      <h1 className="text-3xl font-bold mb-6 text-foreground">Painel de Controle</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animais por mês</CardTitle>
            <FaChartBar className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Total de atendimentos neste mês
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atendimentos (últimas 24h)</CardTitle>
            <FaCalendarAlt className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{last24hAppointments}</div>
            <p className="text-xs text-muted-foreground">Total de atendimentos nas últimas 24 horas</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultas por mês</CardTitle>
            <FaChartLine className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointmentsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Total de consultas registradas neste mês
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque abaixo do mínimo</CardTitle>
            <FaBox className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              Itens com estoque baixo (≤ 5)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle>Últimos animais cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhum animal cadastrado recentemente.</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
          <CardHeader>
            <CardTitle>Últimos acessos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Nenhum acesso recente.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;