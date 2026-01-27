import { Card } from "@/components/ui/card";
import { mockAppointments } from "@/mockData/appointments";
import { getCatalog } from "@/mockData/catalog";
import StatCard from "@/components/saas/StatCard";
import AppointmentList from "@/components/saas/AppointmentList";
import QuickActionCard from "@/components/saas/QuickActionCard";
import {
  CalendarClock,
  BarChart3,
  LineChart,
  AlertTriangle,
  ClipboardList,
  PawPrint,
  ShoppingCart,
  Package,
} from "lucide-react";
import { mockClients } from "@/mockData/clients";

const Dashboard = () => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const appointmentsThisMonth = mockAppointments.filter((app) => {
    const d = new Date(`${app.date}T${app.time || "00:00"}`);
    return d >= startOfMonth && d <= now;
  }).length;

  const last24hAppointments = mockAppointments.filter((app) => {
    const d = new Date(`${app.date}T${app.time || "00:00"}`);
    return now.getTime() - d.getTime() <= 24 * 60 * 60 * 1000;
  }).length;

  const lowStockCount = getCatalog().filter(
    (it) => it.type === "product" && typeof it.stockQty === "number" && it.stockQty <= 5
  ).length;

  const totalAnimals = mockClients.reduce((acc, c) => acc + (c.animals?.length || 0), 0);

  const upcoming = [...mockAppointments]
    .sort((a, b) => {
      const da = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
      const db = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
      return da - db;
    })
    .filter((a) => new Date(`${a.date}T${a.time || "00:00"}`).getTime() >= now.getTime())
    .slice(0, 3);

  return (
    <div className="layered-bg">
      <div className="mb-7">
        <h1 className="text-[26px] font-semibold tracking-tight leading-tight">Painel de Controle</h1>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Visão geral da sua clínica veterinária</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Animais por mês"
          value={totalAnimals}
          subtitle="Você cadastrou pets nos últimos 6 meses"
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title="Últimos atendimentos (24h)"
          value={last24hAppointments}
          subtitle="Atendimentos nas últimas 24 horas"
          icon={CalendarClock}
          color="blue"
        />
        <StatCard
          title="Consultas por mês"
          value={appointmentsThisMonth}
          subtitle="Consultas agendadas este mês"
          icon={LineChart}
          color="purple"
        />
        <StatCard
          title="Estoque abaixo do mínimo"
          value={lowStockCount}
          subtitle="Produtos precisam de reposição"
          icon={AlertTriangle}
          color="orange"
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <AppointmentList title="Próximos Atendimentos" items={upcoming} className="premium-card rounded-xl" />

        <Card className="premium-card rounded-xl p-6">
          <h3 className="text-lg font-semibold leading-tight">Ações Rápidas</h3>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Atalhos para tarefas comuns</p>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <QuickActionCard to="/clients" icon={ClipboardList} title="Nova Consulta" subtitle="Agendar atendimento" />
            <QuickActionCard to="/animals/add" icon={PawPrint} title="Cadastrar Pet" subtitle="Adicionar novo paciente" />
            <QuickActionCard to="/sales/pos" icon={ShoppingCart} title="Nova Venda" subtitle="Registrar venda" />
            <QuickActionCard to="/stock/products-services" icon={Package} title="Ver Estoque" subtitle="Gerenciar produtos" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;