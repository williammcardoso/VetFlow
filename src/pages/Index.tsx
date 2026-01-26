import { MadeWithDyad } from "@/components/made-with-dyad";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center p-8 bg-card rounded-xl shadow-md max-w-2xl mx-auto border border-border">
        <h1 className="text-5xl font-extrabold mb-6 text-foreground">Bem-vindo ao SystemVet</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Sua solução completa para gerenciamento veterinário.
        </p>
        <Link to="/dashboard">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 rounded-lg">
            Ir para o Painel de Controle
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;