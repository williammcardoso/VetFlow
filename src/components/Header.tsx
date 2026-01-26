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
import { Bell, HelpCircle, Moon, Sun, PanelLeft, PanelRight, Settings, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onToggleMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
  isDesktopSidebarOpen: boolean;
  containerClassName?: string;
}

const Header: React.FC<HeaderProps> = ({
  onToggleMobileSidebar,
  onToggleDesktopSidebar,
  isDesktopSidebarOpen,
  containerClassName,
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/70 backdrop-blur-md">
      <div className={cn("h-14 flex items-center gap-3", containerClassName)}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-9 w-9 text-foreground/80 hover:text-foreground hover:bg-muted"
          onClick={onToggleMobileSidebar}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Abrir menu</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex h-9 w-9 text-foreground/80 hover:text-foreground hover:bg-muted"
          onClick={onToggleDesktopSidebar}
        >
          {isDesktopSidebarOpen ? <PanelLeft className="h-5 w-5" /> : <PanelRight className="h-5 w-5" />}
          <span className="sr-only">Alternar sidebar</span>
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="sr-only">Alternar tema</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-foreground/80 hover:text-foreground hover:bg-muted"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
            <span className="sr-only">Notificações</span>
          </Button>

          <Link to="/help">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground/80 hover:text-foreground hover:bg-muted">
              <HelpCircle className="h-4 w-4" />
              <span className="sr-only">Ajuda</span>
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 rounded-full p-0 hover:bg-muted">
                <Avatar className="h-9 w-9 ring-1 ring-border">
                  <AvatarImage src="/placeholder.svg" alt="User Avatar" />
                  <AvatarFallback className="bg-muted text-foreground">WC</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">William Cardoso</p>
                  <p className="text-xs leading-none text-muted-foreground">william@example.com</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;