import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header"; // Importar o novo Header
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile"; // Importar o hook de mobile

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); // Desktop sidebar state

  const handleToggleMobileSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
  };

  // Grid com 2 colunas: sidebar fixo (260px/72px) + conteúdo flexível
  const gridTemplateClass = isDesktopSidebarOpen
    ? "lg:[grid-template-columns:260px_minmax(0,1fr)]"
    : "lg:[grid-template-columns:72px_minmax(0,1fr)]";

  return (
    // Shell com altura total e overflow hidden global; scroll ocorre nos filhos
    <div className={`grid grid-cols-1 ${gridTemplateClass} h-screen bg-background overflow-hidden`}>
      <Sidebar 
        isMobileOpen={isSidebarOpen} 
        onCloseMobile={handleCloseMobileSidebar} 
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={handleToggleDesktopSidebar}
      />
      {/* Conteúdo principal com scroll vertical interno e min-w-0 para permitir encolhimento */}
      <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out`}>
        <Header 
          onToggleMobileSidebar={handleToggleMobileSidebar} 
          onToggleDesktopSidebar={handleToggleDesktopSidebar}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
        />
        <main className="flex-1 p-4 sm:px-6 sm:py-0 min-w-0 h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden">
          {children}
        </main>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Layout;