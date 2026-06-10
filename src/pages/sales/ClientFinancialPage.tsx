import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaTrophy, FaBalanceScale } from "@/components/icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockFinancialTransactions } from "@/mockData/financial";
import { useClientsList } from "@/hooks/useSupabaseClients";
import { PageShell } from "@/components/saas/PageShell";
import { PageHeader } from "@/components/saas/PageHeader";
import { SectionCard } from "@/components/saas/SectionCard";
import { Wallet } from "lucide-react";

const ClientFinancialPage = () => {
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const [tab, setTab] = useState<"ranking" | "balance">("ranking");

  const ranking = useMemo(() => {
    const totals: Record<string, number> = {};
    mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Venda de Produtos" && t.relatedClientId)
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
  }, [clients]);

  const balances = useMemo(() => {
    const totals: Record<string, number> = {};
    mockFinancialTransactions
      .filter(t => t.type === "income" && t.relatedClientId)
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
  }, [clients]);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

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
                  ranking.map((r, idx) => (
                    <Card key={r.clientId} className="vf-surface-card vf-tone-sales card-hover p-4 bg-card border border-border/80">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-muted">#{idx + 1}</span>
                          <span className="text-sm">{r.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-green-600">{fmt(r.amount)}</span>
                      </div>
                      <div className="mt-2">
                        <Link to={`/clients/${r.clientId}`}>
                          <Button variant="outline" size="sm">Ver Cliente</Button>
                        </Link>
                      </div>
                    </Card>
                  ))
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
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{b.name}</span>
                        <span className="text-sm font-semibold text-green-600">{fmt(b.totalPurchases)}</span>
                      </div>
                      <div className="mt-2">
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
