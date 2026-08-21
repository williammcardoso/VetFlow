import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <div className="vf-surface-card text-center p-8">
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! Página não encontrada</p>
        <a href="/" className="text-primary hover:text-primary/90 underline">
          Retornar à Página Inicial
        </a>
      </div>
    </div>
  );
};

export default NotFound;