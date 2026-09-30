"use client";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCircle, PanelLeft, PanelRight, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrentUserProfile } from "@/hooks/useCurrentUserProfile";
import UserAvatarDisplay from "@/components/UserAvatarDisplay";
import { NotificationBell } from "@/components/NotificationBell";

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
  const navigate = useNavigate();
  const { session, signOut } = useAuth();
  const { profile } = useCurrentUserProfile();

  return (
    <header className="vf-topbar-shell sticky top-0 z-40 w-full border-b">
      <div className={cn("h-11 flex items-center gap-2", containerClassName)}>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          onClick={onToggleMobileSidebar}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.55} />
          <span className="sr-only">Abrir menu</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          onClick={onToggleDesktopSidebar}
        >
          {isDesktopSidebarOpen ? (
            <PanelLeft className="h-4 w-4" strokeWidth={1.55} />
          ) : (
            <PanelRight className="h-4 w-4" strokeWidth={1.55} />
          )}
          <span className="sr-only">Alternar sidebar</span>
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5">
          <NotificationBell />

          <Button
            asChild
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            <Link to="/help" aria-label="Ajuda" title="Ajuda">
              <HelpCircle className="h-4 w-4" strokeWidth={1.55} />
              <span className="sr-only">Ajuda</span>
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-muted" aria-label="Menu do usuário">
                <UserAvatarDisplay
                  avatarType={profile?.avatar_type}
                  avatarUrl={profile?.avatar_url}
                  avatarIcon={profile?.avatar_icon}
                  avatarInitials={profile?.avatar_initials}
                  fallbackName={session?.username}
                  className="h-8 w-8 ring-1 ring-border"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">{session?.username || "Usuario"}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {session?.role === "admin" ? "Administrador" : "Usuario"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings/user">
                <Settings className="mr-2 h-4 w-4" strokeWidth={1.55} />
                <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  signOut();
                  toast.info("Sessão finalizada.");
                  navigate("/login");
                }}
              >
                <LogOut className="mr-2 h-4 w-4" strokeWidth={1.55} />
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