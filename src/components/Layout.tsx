import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { applyLayoutTheme, loadLayoutTheme } from "@/lib/layoutTheme";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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