import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaBalanceScale } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockFinancialTransactions } from "@/mockData/financial";
import { useClientsList } from "@/hooks/useSupabaseClients";

const ClientBalancePage = () => {
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const balances = useMemo(() => {
    const totals: Record<string, number> = {};
    mockFinancialTransactions
      .filter(t => t.type === 'income' && t.relatedClientId)
      .forEach(t => {
        const cid = t.relatedClientId as string;
        totals[cid] = (totals[cid] || 0) + t.amount;
      });
    return clients.map(c => ({
      clientId: c.id,
      name: c.name,
      totalPurchases: totals[c.id] || 0,
    })).sort((a, b) => b.totalPurchases - a.totalPurchases);
  }, [clients]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
            <FaBalanceScale className="h-5 w-5 text-muted-foreground" /> Saldo dos Clientes
          </h1>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Vendas &gt; Saldo</p>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Totais por Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {balances.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma venda registrada.</p>
            ) : (
              balances.map(b => (
                <Card key={b.clientId} className="p-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{b.name}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(b.totalPurchases)}
                    </span>
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
      </div>
    </div>
  );
};

export default ClientBalancePage;