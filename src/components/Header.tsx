"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FaBars, FaSun, FaMoon, FaBell, FaQuestionCircle, FaCog, FaSignOutAlt, FaChevronLeft, FaChevronRight } from "react-icons/fa"; // Importar ícones de react-icons
import { useTheme } from "next-themes";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void; // Nova prop para o toggle do desktop
  isDesktopSidebarOpen: boolean; // Nova prop para o estado do sidebar desktop
}

const Header: React.FC<HeaderProps> = ({ onToggleMobileSidebar, onToggleDesktopSidebar, isDesktopSidebarOpen }) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 px-4 backdrop-blur-md sm:static sm:h-auto sm:border-0 sm:bg-card sm:px-6">
      {/* Hamburger menu para mobile */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-foreground hover:bg-muted"
        onClick={onToggleMobileSidebar}
      >
        <FaBars className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>

      {/* Botão de toggle para desktop sidebar */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex text-foreground hover:bg-muted"
        onClick={onToggleDesktopSidebar}
      >
        {isDesktopSidebarOpen ? <FaChevronLeft className="h-5 w-5" /> : <FaChevronRight className="h-5 w-5" />}
        <span className="sr-only">Toggle Desktop Sidebar</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Botão de Dark Mode */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="transition-colors duration-200 text-foreground hover:bg-muted"
        >
          {theme === "dark" ? (
            <FaSun className="h-5 w-5" />
          ) : (
            <FaMoon className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notificações */}
        <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-muted">
          <FaBell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
          <span className="sr-only">Notificações</span>
        </Button>

        {/* Ajuda */}
        <Link to="/help">
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-muted">
            <FaQuestionCircle className="h-5 w-5" />
            <span className="sr-only">Ajuda</span>
          </Button>
        </Link>

        {/* Menu do Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full text-foreground hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder.svg" alt="User Avatar" />
                <AvatarFallback className="bg-muted text-foreground">WC</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">William Cardoso</p>
                <p className="text-xs leading-none text-muted-foreground">
                  william@example.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <FaCog className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <FaSignOutAlt className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;