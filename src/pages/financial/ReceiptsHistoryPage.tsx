import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaMoneyCheckAlt, FaCalendarAlt, FaTag } from "react-icons/fa";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { mockFinancialTransactions } from "@/mockData/financial";
import { formatDateTime } from "@/lib/utils";

const withinRange = (dateStr: string, from?: string, to?: string) => {
  const dt = new Date(`${dateStr}T00:00`);
  const f = from ? new Date(`${from}T00:00`) : undefined;
  const t = to ? new Date(`${to}T23:59`) : undefined;
  return (!f || dt >= f) && (!t || dt <= t);
};

const ReceiptsHistoryPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string | undefined>(undefined);

  const methodList = useMemo(() => {
    const set = new Set<string>();
    mockFinancialTransactions.forEach(t => {
      if (t.type === "income" && t.category === "Recebimento" && t.paymentMethod) set.add(t.paymentMethod);
    });
    return Array.from(set);
  }, []);

  const receipts = useMemo(() => {
    return mockFinancialTransactions
      .filter(t => t.type === "income" && t.category === "Recebimento")
      .filter(t => withinRange(t.date, dateFrom, dateTo))
      .filter(t => !paymentMethod || t.paymentMethod === paymentMethod)
      .sort((a, b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime());
  }, [dateFrom, dateTo, paymentMethod]);

  const total = receipts.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
            <FaMoneyCheckAlt className="h-5 w-5 text-muted-foreground" /> Recebimentos
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro &gt; Recebimentos</p>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">De</label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Até</label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 bg-input border border-border rounded-md" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground">Forma de pagamento</label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger className="h-9 bg-input border border-border rounded-md"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={undefined as any}>Todas</SelectItem>
              {methodList.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <div className="text-sm bg-muted px-3 py-2 rounded-md">
            Total: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
          </div>
        </div>
      </div>

      <div className="p-6">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {receipts.length === 0 ? (
              <p className="text-muted-foreground">Nenhum recebimento encontrado.</p>
            ) : receipts.map(rec => (
              <Card key={rec.id} className="p-4 bg-card border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">Receita</span>
                    <span className="text-sm">{rec.description}</span>
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(rec.amount)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(rec.date, rec.time)}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Pagamento: {rec.paymentMethod || "N/A"}</div>
                  <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Venda: {rec.saleId || "-"}</div>
                </div>
                {rec.relatedClientId && rec.relatedAnimalId && (
                  <div className="mt-2">
                    <Link to={`/clients/${rec.relatedClientId}/animals/${rec.relatedAnimalId}/record`}>
                      <Button variant="outline" size="sm">Abrir Prontuário</Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReceiptsHistoryPage;