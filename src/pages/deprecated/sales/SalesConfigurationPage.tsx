import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaCog } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SalesConfigurationPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-950 p-6 pb-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-[#1E293B] dark:text-gray-100 group">
                <FaCog className="h-5 w-5 text-gray-500 dark:text-gray-400" /> Configuração de Vendas
              </h1>
              <p className="text-sm text-[#6B7280] dark:text-gray-400 mt-1 mb-4">
                Ajuste as configurações do módulo de vendas.
              </p>
            </div>
          </div>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Painel &gt; Vendas &gt; Configuração
        </p>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md text-center bg-white/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] border-t-4 border-blue-400 dark:bg-gray-800/90">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-[#374151] dark:text-gray-100">
              Funcionalidade em Breve!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              A página de Configuração de Vendas está em desenvolvimento. Volte em breve para mais novidades!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesConfigurationPage;