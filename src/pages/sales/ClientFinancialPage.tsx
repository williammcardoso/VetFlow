import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaTrophy, FaBalanceScale } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { useFinancialTransactions } from "@/hooks/useFinancialTransactions";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { Wallet, Crown, Medal } from "lucide-react";
import { cn, formatCurrencyBRL } from "@/lib/utils";

// Visual do top 3 do ranking — ouro/prata/bronze com ícone e leve realce no
// card; a partir do 4º lugar é só a bolinha numerada padrão.
const RANK_TIERS = [
  {
    icon: Crown,
    iconClass: "text-amber-500",
    avatarClass: "bg-amber-100 text-amber-700 ring-2 ring-amber-300",
    cardClass: "border-amber-300/70 bg-amber-50/40",
  },
  {
    icon: Medal,
    iconClass: "text-slate-400",
    avatarClass: "bg-slate-100 text-slate-600 ring-2 ring-slate-300",
    cardClass: "border-slate-300/70 bg-slate-50/40",
  },
  {
    icon: Medal,
    iconClass: "text-orange-700",
    avatarClass: "bg-orange-100 text-orange-800 ring-2 ring-orange-300",
    cardClass: "border-orange-300/70 bg-orange-50/40",
  },
] as const;

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";

const ClientFinancialPage = () => {
  const { data: dbClients } = useClientsList();
  const { transactions: mockFinancialTransactions } = useFinancialTransactions();
  const clients = dbClients || [];
  const [tab, setTab] = useState<"ranking" | "balance">("ranking");

  const ranking = useMemo(() => {
    const totals: Record<string, number> = {};
    mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Venda de Produtos" && t.relatedClientId && t.status !== "cancelled")
      .forEach(t => {
        const cid = t.relatedClientId as string;
        totals[cid] = (totals[cid] || 0) + t.amount;
      });
    return Object.entries(totals)
      .map(([cid, amount]) => ({
        clientId: cid,
        name: clients.find(c => c.id === cid)?.name || "N/A",
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [clients, mockFinancialTransactions]);

  const balances = useMemo(() => {
    const totals: Record<string, number> = {};
    // Mesmo filtro do ranking acima: "Recebimento" é o pagamento de uma venda
    // já contada em "Venda de Produtos" — contar os dois somava a mesma
    // venda em dobro no saldo do cliente. Venda cancelada também não conta.
    mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Venda de Produtos" && t.relatedClientId && t.status !== "cancelled")
      .forEach(t => {
        const cid = t.relatedClientId as string;
        totals[cid] = (totals[cid] || 0) + t.amount;
      });
    return clients
      .map(c => ({
        clientId: c.id,
        name: c.name,
        totalPurchases: totals[c.id] || 0,
      }))
      .sort((a, b) => b.totalPurchases - a.totalPurchases);
  }, [clients, mockFinancialTransactions]);

  const fmt = (v: number) =>
    formatCurrencyBRL(v);

  return (
    <PageShell>
      <PageHeader
        title="Clientes Financeiros"
        description="Acompanhe ranking comercial e volume financeiro por cliente."
        icon={Wallet}
        module="sales"
        breadcrumb={<>Painel &gt; Comercial &gt; Clientes Financeiros</>}
        actions={
          <Link to="/financial">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </Link>
        }
      />

      <SectionCard
        title="Análise financeira por cliente"
        description="Compare clientes por volume de vendas e total acumulado."
        icon={Wallet}
        tone="sales"
      >
        <Tabs value={tab} onValueChange={(v) => setTab(v as "ranking" | "balance")}>
          <TabsList className="grid grid-cols-2 w-full max-w-md mb-4">
            <TabsTrigger value="ranking" className="gap-2">
              <FaTrophy className="h-3.5 w-3.5" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="balance" className="gap-2">
              <FaBalanceScale className="h-3.5 w-3.5" /> Saldo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ranking">
            <Card className="vf-surface-card vf-tone-sales card-hover border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Top Clientes por Vendas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ranking.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma venda registrada.</p>
                ) : (
                  ranking.map((r, idx) => {
                    const tier = RANK_TIERS[idx];
                    const maxAmount = ranking[0]?.amount || 1;
                    const barPct = Math.max(4, Math.round((r.amount / maxAmount) * 100));
                    return (
                      <Card
                        key={r.clientId}
                        className={cn(
                          "vf-surface-card vf-tone-sales card-hover p-4 bg-card border border-border/80",
                          tier?.cardClass
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="relative shrink-0">
                              <div
                                className={cn(
                                  "flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold",
                                  tier?.avatarClass ?? "bg-muted text-muted-foreground"
                                )}
                              >
                                {getInitials(r.name)}
                              </div>
                              {tier ? (
                                <tier.icon
                                  className={cn("absolute -right-1 -top-1 h-4 w-4 rounded-full bg-card p-0.5", tier.iconClass)}
                                  strokeWidth={2.4}
                                />
                              ) : (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-1 ring-border">
                                  {idx + 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium">{r.name}</span>
                              <span className="text-xs text-muted-foreground">{idx + 1}º lugar</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold text-green-600">{fmt(r.amount)}</span>
                        </div>
                        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-orange-500" : "bg-vf-sales"
                            )}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <div className="mt-2.5">
                          <Link to={`/clients/${r.clientId}`}>
                            <Button variant="outline" size="sm">Ver Cliente</Button>
                          </Link>
                        </div>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balance">
            <Card className="vf-surface-card vf-tone-sales card-hover border-border/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold">Totais por Cliente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {balances.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma venda registrada.</p>
                ) : (
                  balances.map(b => (
                    <Card key={b.clientId} className="vf-surface-card vf-tone-sales card-hover p-4 bg-card border border-border/80">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--vf-sales)/0.12)] text-xs font-bold text-vf-sales">
                            {getInitials(b.name)}
                          </div>
                          <span className="truncate text-sm font-medium">{b.name}</span>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-green-600">{fmt(b.totalPurchases)}</span>
                      </div>
                      <div className="mt-2.5">
                        <Link to={`/clients/${b.clientId}`}>
                          <Button variant="outline" size="sm">Ver Cliente</Button>
                        </Link>
                      </div>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SectionCard>
    </PageShell>
  );
};

export default ClientFinancialPage;
