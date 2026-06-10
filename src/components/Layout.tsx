import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useIsMobile } from "@/hooks/use-mobile";
import { applyLayoutTheme, loadLayoutTheme } from "@/lib/layoutTheme";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  const handleToggleMobileSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleCloseMobileSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
  };

  const containerPaddingClass = isDesktopSidebarOpen ? "lg:pl-64" : "lg:pl-16";

  const contentMaxWidthClass = isDesktopSidebarOpen
    ? "lg:max-w-[calc(100vw-18rem)]"
    : "lg:max-w-[calc(100vw-6rem)]";

  const containerClassName = `mx-auto w-full ${contentMaxWidthClass} px-4 sm:px-6`;

  React.useEffect(() => {
    applyLayoutTheme(loadLayoutTheme());
  }, []);

  return (
    <div className={`flex h-screen bg-background ${containerPaddingClass} overflow-hidden`}>
      <Sidebar
        isMobileOpen={isSidebarOpen}
        onCloseMobile={handleCloseMobileSidebar}
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={handleToggleDesktopSidebar}
      />

      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        <Header
          onToggleMobileSidebar={handleToggleMobileSidebar}
          onToggleDesktopSidebar={handleToggleDesktopSidebar}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          containerClassName={containerClassName}
        />

        <main className="flex-1 overflow-y-auto layered-bg">
          <div className={`mx-auto w-full ${contentMaxWidthClass} px-4 sm:px-6 py-6`}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;