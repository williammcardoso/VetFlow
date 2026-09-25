import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { applyLayoutTheme, loadLayoutTheme } from "@/lib/layoutTheme";

interface LayoutProps {
  children: React.ReactNode;
}

// Preferência "menu lateral aberto/recolhido" por aparelho (localStorage é
// por navegador): quem recolheu no tablet não precisa recolher de novo a
// cada recarga, e o computador continua com a escolha dele.
const SIDEBAR_EXPANDED_KEY = "vf:layout:sidebar-expanded";

// Sem preferência salva, o menu só começa aberto em tela larga (>= 1280px).
// No tablet em pé (~800px) o menu aberto (16rem) comia 1/3 da tela e deixava
// o conteúdo com ~540px — as telas com 2-3 colunas ficavam espremidas.
function initialSidebarExpanded(): boolean {
  try {
    const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
    if (saved === "1") return true;
    if (saved === "0") return false;
  } catch {
    // localStorage indisponível (modo privado etc.) — cai no padrão por largura
  }
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia("(min-width: 1280px)").matches;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(initialSidebarExpanded);

  const handleToggleMobileSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        // ignora — só não lembra a escolha
      }
      return next;
    });
  };

  // Gaveta do celular aberta + girar pro modo paisagem (ou abrir a janela)
  // passando de 768px: o menu vira fixo e a gaveta perdia o sentido, ficando
  // aberta por cima do conteúdo. Fecha ao cruzar o breakpoint.
  React.useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsSidebarOpen(false);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  const containerPaddingClass = isDesktopSidebarOpen
    ? "md:pl-[var(--vf-sidebar-w)]"
    : "md:pl-[var(--vf-sidebar-w-collapsed)]";

  const contentMaxWidthClass = isDesktopSidebarOpen
    ? "md:max-w-[calc(100vw-var(--vf-sidebar-w)-2rem)]"
    : "md:max-w-[calc(100vw-var(--vf-sidebar-w-collapsed)-2rem)]";

  const containerClassName = `mx-auto w-full ${contentMaxWidthClass} px-4 sm:px-6`;

  React.useEffect(() => {
    applyLayoutTheme(loadLayoutTheme());
  }, []);

  return (
    <div className={`vf-viewport-h flex bg-background ${containerPaddingClass} overflow-hidden`}>
      <Sidebar
        isMobileOpen={isSidebarOpen}
        onCloseMobile={handleCloseMobileSidebar}
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={handleToggleDesktopSidebar}
      />

      <div className="vf-viewport-h flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          onToggleMobileSidebar={handleToggleMobileSidebar}
          onToggleDesktopSidebar={handleToggleDesktopSidebar}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          containerClassName={containerClassName}
        />

        {/* overflow-x-hidden: rede de segurança — se algum conteúdo ainda
            passar da largura, a tela não fica "solta" arrastando pros lados
            no celular (overflow-y-auto sozinho liga a rolagem horizontal
            também). As telas em si já foram ajustadas pra caber. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden layered-bg">
          <div className={`mx-auto w-full ${contentMaxWidthClass} px-4 py-4 sm:px-6 sm:py-6`}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
