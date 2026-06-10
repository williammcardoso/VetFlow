import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaSearchDollar, FaCalendarAlt, FaTag, FaPaw, FaUser } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockFinancialTransactions } from "@/mockData/financial";
import { formatDateTime } from "@/lib/utils";
import { useClientsList } from "@/hooks/useSupabaseClients";

const ConsultSalesPage = () => {
  const { data: dbClients } = useClientsList();
  const clients = dbClients || [];
  const [clientId, setClientId] = useState<string | undefined>(undefined);
  const [animalId, setAnimalId] = useState<string | undefined>(undefined);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const animals = useMemo(() => {
    if (!clientId) return [];
    const client = clients.find(c => c.id === clientId);
    return client?.animals || [];
  }, [clientId, clients]);

  const sales = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === 'income' && t.category === 'Venda de Produtos')
      .filter(t => !clientId || t.relatedClientId === clientId)
      .filter(t => !animalId || t.relatedAnimalId === animalId)
      .filter(t => {
        if (!dateFrom && !dateTo) return true;
        const dt = new Date(`${t.date}T${t.time}`);
        const from = dateFrom ? new Date(`${dateFrom}T00:00`) : undefined;
        const to = dateTo ? new Date(`${dateTo}T23:59`) : undefined;
        return (!from || dt >= from) && (!to || dt <= to);
      })
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [clientId, animalId, dateFrom, dateTo]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
            <FaSearchDollar className="h-5 w-5 text-muted-foreground" /> Consulta de Vendas
          </h1>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Vendas &gt; Consulta Vendas</p>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">Cliente</label>
          <Select onValueChange={setClientId} value={clientId}>
            <SelectTrigger className="h-9 bg-input">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Animal</label>
          <Select onValueChange={setAnimalId} value={animalId}>
            <SelectTrigger className="h-9 bg-input">
              <SelectValue placeholder="Selecione o animal" />
            </SelectTrigger>
            <SelectContent>
              {animals.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input" />
        </div>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sales.length === 0 ? (
              <p className="text-muted-foreground">Nenhuma venda no período/critério selecionado.</p>
            ) : (
              sales.map(sale => (
                <Card key={sale.id} className="p-4 bg-card border border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FaUser className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Cliente: {clients.find(c => c.id === sale.relatedClientId)?.name || "N/A"}</span>
                      {sale.relatedAnimalId && (
                        <>
                          <FaPaw className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Animal: {clients.find(c => c.id === sale.relatedClientId)?.animals.find(a => a.id === sale.relatedAnimalId)?.name || "N/A"}</span>
                        </>
                      )}
                    </div>
                    <div className="text-sm font-semibold">
                      R$ {sale.amount.toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(sale.date, sale.time)}</div>
                    <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> {sale.category}</div>
                    <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Pagamento: {sale.paymentMethod || "N/A"}</div>
                  </div>
                  {sale.relatedClientId && sale.relatedAnimalId && (
                    <div className="mt-2">
                      <Link to={`/clients/${sale.relatedClientId}/animals/${sale.relatedAnimalId}/record`}>
                        <Button variant="outline" size="sm">Abrir Prontuário</Button>
                      </Link>
                    </div>
                  )}
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsultSalesPage;