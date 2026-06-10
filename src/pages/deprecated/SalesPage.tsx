import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaShoppingCart, FaPlus, FaDollarSign, FaCalendarAlt, FaTag, FaPaw, FaEye } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { mockFinancialTransactions } from "@/mockData/financial";
import { useClientsList } from "@/hooks/useSupabaseClients";

const SalesPage = () => {
  const { data: dbClients, isError: isClientsError } = useClientsList();
  const clients = dbClients || [];
  // Filtrar apenas transações de 'income' com categoria 'Venda de Produtos'
  const salesTransactions = mockFinancialTransactions.filter(
    (t) => t.type === 'income' && t.category === 'Venda de Produtos'
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Ordenar por data

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const getAnimalName = (clientId?: string, animalId?: string) => {
    if (!clientId || !animalId) return 'N/A';
    const client = clients.find(c => c.id === clientId);
    const animal = client?.animals.find(a => a.id === animalId);
    return animal?.name || 'N/A';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header da Página com Gradiente e Breadcrumb */}
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#1E293B] dark:text-gray-100 group">
                <FaShoppingCart className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Minhas Vendas
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 mb-4">
                Visualize e gerencie todas as transações de vendas.
              </p>
            </div>
          </div>
          <Link to="/">
            <Button variant="outline" className="rounded-md border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Painel
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Painel &gt; Vendas &gt; Minhas Vendas
        </p>
      </div>

      <div className="flex-1 p-6">
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.08)] transition-all duration-300 border-t-4 border-blue-400 dark:bg-gray-800/90">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[#374151] dark:text-gray-100">
              <FaDollarSign className="h-5 w-5 text-blue-500" /> Transações de Venda
            </CardTitle>
            <Link to="/sales/pos">
              <Button size="sm" className="rounded-md bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600 font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                <FaPlus className="h-4 w-4 mr-2" /> Nova Venda
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            {salesTransactions.length > 0 ? (
              <div className="space-y-4">
                {salesTransactions.map((transaction) => (
                  <Card key={transaction.id} className="p-4 bg-background dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Venda
                        </span>
                        <p className="text-lg font-semibold text-foreground">
                          {transaction.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-lg font-bold text-green-600 dark:text-green-400">
                        <FaDollarSign className="h-4 w-4" />
                        R$ {transaction.amount.toFixed(2).replace('.', ',')}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FaCalendarAlt className="h-3 w-3" /> {formatDate(transaction.date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <FaTag className="h-3 w-3" /> Categoria: {transaction.category}
                      </div>
                      {transaction.relatedAnimalId && (
                        <div className="flex items-center gap-1">
                          <FaPaw className="h-3 w-3" /> Animal: {getAnimalName(transaction.relatedClientId, transaction.relatedAnimalId)}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm" className="rounded-md hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors duration-200">
                        <FaEye className="h-4 w-4 mr-2" /> Ver Detalhes
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground py-4">
                {isClientsError ? "Falha ao carregar clientes do banco." : "Nenhuma venda registrada."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesPage;