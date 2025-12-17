import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaMoneyBillWave, FaPlus, FaDollarSign, FaArrowUp, FaArrowDown, FaChartLine, FaWallet, FaTag, FaCalendarAlt, FaPaw } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getOverallFinancialSummary, mockFinancialTransactions } from "@/mockData/financial";
import { mockClients } from "@/mockData/clients";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Importar as páginas existentes para reutilizar dentro das abas
import BudgetsPage from "../pages/sales/BudgetsPage";
import SalesPage from "../pages/sales/SalesPage";

const FinancialPage = () => {
  const { totalRevenue, totalExpenses, netProfit } = getOverallFinancialSummary();

  // Ordenar transações por data e hora, mais recentes primeiro
  const sortedTransactions = [...mockFinancialTransactions].sort((a, b) => {
    const dateTimeA = new Date(`${a.date}T${a.time}`);
    const dateTimeB = new Date(`${b.date}T${b.time}`);
    return dateTimeB.getTime() - dateTimeA.getTime();
  });

  const formatDateTime = (dateString: string, timeString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year} ${timeString}`;
  };

  const getAnimalName = (clientId?: string, animalId?: string) => {
    if (!clientId || !animalId) return 'N/A';
    const client = mockClients.find(c => c.id === clientId);
    const animal = client?.animals.find(a => a.id === animalId);
    return animal?.name || 'N/A';
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-4 sm:gap-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaMoneyBillWave className="h-5 w-5 text-muted-foreground" /> Módulo Financeiro
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Orçamentos, Vendas e Lançamentos em uma única tela.
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Painel
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Financeiro</p>
      </div>

      {/* Abas unificadas */}
      <div className="flex-1 p-6">
        <Tabs defaultValue="financeiro" className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-4">
            <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            <TabsTrigger value="vendas">Vendas</TabsTrigger>
            <TabsTrigger value="financeiro">Lançamentos</TabsTrigger>
          </TabsList>

          {/* Aba Orçamentos: reuso da página existente */}
          <TabsContent value="orcamentos">
            <Card className="shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Orçamentos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <BudgetsPage />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Vendas: reuso da página existente */}
          <TabsContent value="vendas">
            <Card className="shadow-sm border border-border rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Vendas</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <SalesPage />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Lançamentos (conteúdo atual do FinancialPage) */}
          <TabsContent value="financeiro">
            {/* Cards de Resumo */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
                  <FaArrowUp className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">R$ {totalRevenue.toFixed(2).replace('.', ',')}</div>
                  <p className="text-xs text-muted-foreground">Total de entradas no período.</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas Totais</CardTitle>
                  <FaArrowDown className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">R$ {totalExpenses.toFixed(2).replace('.', ',')}</div>
                  <p className="text-xs text-muted-foreground">Total de saídas no período.</p>
                </CardContent>
              </Card>

              <Card className="shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                  <FaChartLine className={cn("h-5 w-5", netProfit >= 0 ? "text-primary" : "text-destructive")} />
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", netProfit >= 0 ? "text-primary" : "text-destructive")}>R$ {netProfit.toFixed(2).replace('.', ',')}</div>
                  <p className="text-xs text-muted-foreground">Resultado financeiro geral.</p>
                </CardContent>
              </Card>
            </div>

            {/* Lançamentos Recentes */}
            <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-border rounded-md">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <FaWallet className="h-5 w-5 text-primary" /> Lançamentos Recentes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {sortedTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {sortedTransactions.map((transaction) => (
                      <Card key={transaction.id} className="p-4 bg-card shadow-sm border border-border">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded-full",
                              transaction.type === 'income' ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            )}>
                              {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                            </span>
                            <p className="text-lg font-semibold text-foreground">{transaction.description}</p>
                          </div>
                          <div className={cn("flex items-center gap-1 text-lg font-bold", transaction.type === 'income' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                            R$ {transaction.amount.toFixed(2).replace('.', ',')}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1"><FaCalendarAlt className="h-3 w-3" /> {formatDateTime(transaction.date, transaction.time)}</div>
                          <div className="flex items-center gap-1"><FaTag className="h-3 w-3" /> Categoria: {transaction.category}</div>
                          {transaction.relatedAnimalId && (
                            <div className="flex items-center gap-1"><FaPaw className="h-3 w-3" /> Animal: {getAnimalName(transaction.relatedClientId, transaction.relatedAnimalId)}</div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground py-4">Nenhum lançamento financeiro registrado.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FinancialPage;