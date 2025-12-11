import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart, FaTrophy } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockFinancialTransactions } from "@/mockData/financial";
import { mockClients } from "@/mockData/clients";

const ClientRankingPage = () => {
  const ranking = useMemo(() => {
    const totals: Record<string, number> = {};
    mockFinancialTransactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos' && t.relatedClientId)
      .forEach(t => {
        const cid = t.relatedClientId as string;
        totals[cid] = (totals[cid] || 0) + t.amount;
      });
    return Object.entries(totals)
      .map(([cid, amount]) => ({ clientId: cid, name: mockClients.find(c => c.id === cid)?.name || "N/A", amount }))
      .sort((a, b) => b.amount - a.amount);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
            <FaTrophy className="h-5 w-5 text-yellow-500" /> Ranking de Clientes
          </h1>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Vendas &gt; Ranking</p>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Top Clientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranking.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma venda registrada.</p>
            ) : (
              ranking.map((r, idx) => (
                <Card key={r.clientId} className="p-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded-full bg-muted">#{idx + 1}</span>
                      <span className="text-sm">{r.name}</span>
                    </div>
                    <div className="text-sm font-semibold text-green-600">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.amount)}
                    </div>
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
      </div>
    </div>
  );
};

export default ClientRankingPage;