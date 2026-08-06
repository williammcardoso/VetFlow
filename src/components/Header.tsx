"use client";

import React from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useSchedulesList } from "@/hooks/useSchedules";
import { getCatalog } from "@/mockData/catalog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

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
  const userInitials = React.useMemo(() => {
    const source = session?.username?.trim() || "US";
    return source.slice(0, 2).toUpperCase();
  }, [session?.username]);

  const { theme, setTheme } = useTheme();
  const { data: schedules = [] } = useSchedulesList();
  const [dismissedNotifications, setDismissedNotifications] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vf_notifications_dismissed") || "[]");
    } catch {
      return [];
    }
  });

  const notifications = React.useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const normalizeStatus = (value: unknown) => {
      const raw = String(value ?? "scheduled").toLowerCase().trim();
      if (raw === "agendado") return "scheduled";
      if (raw === "em atendimento") return "in_progress";
      if (raw === "atendido") return "attended";
      if (raw === "não atendido" || raw === "nao atendido") return "no_show";
      if (raw === "cancelado") return "cancelled";
      return raw;
    };
    const toDateTime = (s: { date: Date; time: string }) => {
      const d = new Date(s.date);
      const [h = 0, m = 0] = (s.time || "00:00").split(":").map(Number);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const lowStockCount = getCatalog().filter((it) => it.type === "product" && (it.stockQty ?? 0) <= 5).length;
    const upcoming2h = schedules.filter((s) => {
      const status = normalizeStatus(s.status);
      if (status !== "scheduled" && status !== "in_progress") return false;
      const date = toDateTime(s);
      const diff = date.getTime() - now.getTime();
      return diff >= 0 && diff <= 2 * 60 * 60 * 1000;
    }).length;
    const unattended = schedules.filter((s) => {
      const status = normalizeStatus(s.status);
      const date = toDateTime(s);
      return date >= startOfToday && date < now && (status === "scheduled" || status === "in_progress");
    }).length;

    return [
      {
        id: "notif-upcoming-2h",
        title: "Agenda imediata",
        description: `${upcoming2h} atendimento(s) nas próximas 2h.`,
        href: "/agenda",
        visible: upcoming2h > 0,
      },
      {
        id: "notif-unattended",
        title: "Pendências de atendimento",
        description: `${unattended} atendimento(s) sem conclusão.`,
        href: "/agenda",
        visible: unattended > 0,
      },
      {
        id: "notif-low-stock",
        title: "Estoque crítico",
        description: `${lowStockCount} item(ns) com estoque baixo.`,
        href: "/stock/products-services",
        visible: lowStockCount > 0,
      },
    ].filter((n) => n.visible);
  }, [schedules]);

  const unreadNotifications = notifications.filter((n) => !dismissedNotifications.includes(n.id));

  const handleMarkAllRead = () => {
    const ids = notifications.map((n) => n.id);
    setDismissedNotifications(ids);
    localStorage.setItem("vf_notifications_dismissed", JSON.stringify(ids));
  };

  return (
    <header className="vf-topbar-shell sticky top-0 z-40 w-full border-b">
      <div className={cn("h-11 flex items-center gap-2", containerClassName)}>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          onClick={onToggleMobileSidebar}
        >
          <PanelLeft className="h-4 w-4" strokeWidth={1.55} />
          <span className="sr-only">Abrir menu</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="hidden lg:inline-flex h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" strokeWidth={1.55} />
            ) : (
              <Moon className="h-4 w-4" strokeWidth={1.55} />
            )}
            <span className="sr-only">Alternar tema</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <Bell className="h-4 w-4" strokeWidth={1.55} />
                {unreadNotifications.length > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />}
                <span className="sr-only">Notificações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80" align="end">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notificações automáticas</span>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMarkAllRead}>
                  Marcar tudo como lido
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <DropdownMenuItem disabled>Sem notificações no momento.</DropdownMenuItem>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => {
                      navigate(notification.href);
                      setDismissedNotifications((prev) => {
                        const next = Array.from(new Set([...prev, notification.id]));
                        localStorage.setItem("vf_notifications_dismissed", JSON.stringify(next));
                        return next;
                      });
                    }}
                    className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
                  >
                    <span className="text-sm font-semibold">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">{notification.description}</span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
              <Button variant="ghost" className="h-8 w-8 rounded-full p-0 hover:bg-muted">
                <Avatar className="h-8 w-8 ring-1 ring-border">
                  <AvatarImage src="/placeholder.svg" alt="User Avatar" />
                  <AvatarFallback className="bg-muted text-foreground">{userInitials}</AvatarFallback>
                </Avatar>
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