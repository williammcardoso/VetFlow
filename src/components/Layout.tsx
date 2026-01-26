import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { MadeWithDyad } from "./made-with-dyad";
import { useIsMobile } from "@/hooks/use-mobile";

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

  return (
    <div className={`flex min-h-screen bg-background ${containerPaddingClass} overflow-x-hidden`}>
      <Sidebar
        isMobileOpen={isSidebarOpen}
        onCloseMobile={handleCloseMobileSidebar}
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={handleToggleDesktopSidebar}
      />

      <div className="flex flex-col flex-1 transition-all duration-300 ease-in-out">
        <Header
          onToggleMobileSidebar={handleToggleMobileSidebar}
          onToggleDesktopSidebar={handleToggleDesktopSidebar}
          isDesktopSidebarOpen={isDesktopSidebarOpen}
          containerClassName={containerClassName}
        />

        <main className="flex-1">
          <div className={`mx-auto w-full ${contentMaxWidthClass} px-4 sm:px-6 py-6`}>{children}</div>
        </main>

        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Layout;