import React from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft, FaFileInvoiceDollar } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BudgetModelPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground group">
                <FaFileInvoiceDollar className="h-5 w-5 text-muted-foreground" /> Modelo de Orçamento
              </h1>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Gerencie os modelos de orçamento para vendas.
              </p>
            </div>
          </div>
          <Link to="/sales/my-sales">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar para Vendas
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Painel &gt; Vendas &gt; Modelo de Orçamento
        </p>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="w-full max-w-md text-center shadow-sm border border-border rounded-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">
              Funcionalidade em Breve!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              A página de Modelo de Orçamento está em desenvolvimento. Volte em breve para mais novidades!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BudgetModelPage;