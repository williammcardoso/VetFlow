import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FaArrowLeft, FaQuestionCircle, FaBook } from "react-icons/fa";

const HelpPage = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="bg-gradient-to-r from-background via-card to-background p-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold flex items-center gap-3 text-foreground">
            <FaQuestionCircle className="h-5 w-5 text-primary" /> Ajuda
          </h1>
          <Link to="/dashboard">
            <Button variant="outline" className="rounded-md border-border text-foreground hover:bg-muted hover:text-foreground transition-colors duration-200">
              <FaArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Painel &gt; Ajuda</p>
      </div>

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <Card className="border border-border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FaBook className="h-5 w-5 text-primary" /> VetFlow – Gestão veterinária
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <p>
              Use o menu lateral para acessar Clientes, Agenda, Vendas, Cadastros, Estoque, Financeiro e Configurações.
            </p>
            <p>
              Para suporte ou documentação detalhada, entre em contato com o administrador do sistema.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HelpPage;
