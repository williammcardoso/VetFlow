import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import SystemVetLogo from "./SystemVetLogo";
import { useAuth } from "@/contexts/AuthContext";
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Folder,
  LayoutDashboard,
  Package,
  PawPrint,
  Receipt,
  Settings,
  Shield,
  ShoppingCart,
  Stethoscope,
  Users,
  Wallet,
  ClipboardList,
  Tag,
  Scale,
  RotateCcw,
  BarChart3,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  subItems?: NavItem[];
  section?: string;
  requireRole?: "admin" | "user";
}

const navItemsBase: NavItem[] = [
  { title: "Painel de Controle", href: "/dashboard", icon: LayoutDashboard, section: "Atendimento" },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  { title: "Clientes", href: "/clients", icon: Users },
  { title: "Previsão de Retornos", href: "/clinical/returns-forecast", icon: RotateCcw },
  { title: "Relatório de Atendimentos", href: "/clinical/appointments-report", icon: BarChart3 },
  {
    title: "Comercial",
    icon: ShoppingCart,
    section: "Comercial",
    subItems: [
      { title: "Vendas", href: "/sales/my-sales", icon: Receipt },
      { title: "PDV", href: "/sales/pos", icon: DollarSign },
      { title: "Orçamentos", href: "/sales/budgets", icon: FileText },
      { title: "Recebimentos", href: "/sales/receipts", icon: Receipt },
      { title: "Lista de Preços", href: "/sales/price-list", icon: Tag },
      { title: "Relatório de vendas", href: "/sales/reports", icon: FileText },
    ],
  },
  {
    title: "Financeiro",
    icon: Wallet,
    section: "Financeiro",
    subItems: [
      { title: "Visão geral", href: "/financial", icon: Wallet },
      { title: "Relatórios", href: "/financial/reports", icon: FileText },
      { title: "Fechamento 50/50", href: "/financial/monthly-closing", icon: Scale },
      { title: "Clientes financeiros", href: "/sales/client-financial", icon: Users },
      { title: "Formas de pagamento", href: "/financial/payment-methods", icon: CreditCard },
    ],
  },
  {
    title: "Estoque",
    icon: Package,
    section: "Estoque",
    subItems: [
      { title: "Catálogo", href: "/stock/products-services", icon: Package },
      { title: "Compras", href: "/stock/purchases", icon: ShoppingCart },
    ],
  },
  {
    title: "Cadastros",
    icon: Folder,
    subItems: [
      { title: "Espécies", href: "/registrations/species", icon: PawPrint },
      { title: "Raças", href: "/registrations/breeds", icon: PawPrint },
      { title: "Cores de Pelagem", href: "/registrations/coat-types", icon: PawPrint },
      { title: "Tipos de atendimento", href: "/registrations/appointment-types", icon: ClipboardList },
      { title: "Vacinas", href: "/registrations/vaccines", icon: ClipboardList },
      { title: "Exames", href: "/registrations/exams", icon: ClipboardList },
      { title: "Referências de exames", href: "/registrations/exam-references", icon: ClipboardList },
      { title: "Modelo de documento", href: "/registrations/document-model", icon: FileText },
    ],
  },
  {
    title: "Configuração",
    icon: Settings,
    subItems: [
      { title: "Empresa", href: "/settings/company", icon: Settings },
      { title: "Usuários", href: "/settings/user", icon: Users },
      { title: "Usuarios do sistema", href: "/settings/users-management", icon: Shield, requireRole: "admin" },
      { title: "Aparência", href: "/settings/appearance", icon: Settings },
      { title: "Acesso externo", href: "/settings/external-access", icon: Settings, requireRole: "admin" },
      { title: "Perfil de Acesso", href: "/settings/access-profile", icon: Settings, requireRole: "admin" },
    ],
  },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isDesktopOpen: boolean;
  onToggleDesktop: () => void;
}

function NavIcon({ icon: Icon, active }: { icon: React.ElementType; active?: boolean }) {
  return (
    <Icon
      className={cn(
        "h-[18px] w-[18px] shrink-0 transition-colors vf-sidebar-text-soft",
        active && "vf-sidebar-text"
      )}
      strokeWidth={1.6}
    />
  );
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile, isDesktopOpen }) => {
  const location = useLocation();
  const { session, canAccessPath } = useAuth();
  const [openCollapsedMenu, setOpenCollapsedMenu] = React.useState<string | null>(null);
  const isAdmin = session?.role === "admin";

  const navItems = React.useMemo(() => {
    const canSee = (item: NavItem) => {
      const roleAllowed = !item.requireRole || item.requireRole === "user" || isAdmin;
      if (!roleAllowed) return false;
      if (!item.href) return true;
      return canAccessPath(item.href, "view");
    };

    return navItemsBase
      .map((item) => {
        if (item.subItems) {
          const allowedSubItems = item.subItems.filter(canSee);
          if (allowedSubItems.length === 0) return null;
          return { ...item, subItems: allowedSubItems };
        }
        return canSee(item) ? item : null;
      })
      .filter((item): item is NavItem => Boolean(item));
  }, [canAccessPath, isAdmin]);

  React.useEffect(() => {
    setOpenCollapsedMenu(null);
  }, [location.pathname, isDesktopOpen]);

  return (
    <>
      {isMobileOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} />}

      <aside
        className={cn(
          "vf-sidebar-shell h-screen fixed left-0 top-0 overflow-y-auto border-r",
          "px-3 py-4 shadow-sm transition-all duration-300 ease-in-out z-50 hide-scrollbar",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full",
          isDesktopOpen ? "lg:translate-x-0 lg:w-64" : "lg:translate-x-0 lg:w-[74px]"
        )}
      >
        <div className={cn("h-12 flex items-center", isDesktopOpen ? "px-2" : "px-0 justify-center")}>
          {isDesktopOpen ? (
            <SystemVetLogo />
          ) : (
            <Stethoscope className="h-[18px] w-[18px] vf-sidebar-text" strokeWidth={1.55} />
          )}
        </div>

        <nav className="mt-4 space-y-2">
          {isDesktopOpen ? (
            <Accordion type="multiple" className="w-full">
              {navItems.map((item, index) => {
                const isActive = !!item.href && location.pathname === item.href;

                return (
                  <React.Fragment key={item.title}>
                    {item.href ? (
                      <Link
                        to={item.href}
                        className={cn(
                        "vf-nav-hover group flex min-h-11 items-center transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 px-3 gap-3 justify-start",
                          isActive && "vf-nav-active ring-1 ring-primary/35"
                        )}
                        onClick={onCloseMobile}
                      >
                        <NavIcon icon={item.icon} active={isActive} />
                        <span
                          className={cn(
                            "text-[13.5px] leading-none transition-colors relative top-[0.5px]",
                            isActive ? "font-medium vf-sidebar-text" : "font-normal vf-sidebar-text-soft"
                          )}
                        >
                          {item.title}
                        </span>
                      </Link>
                    ) : (
                      <AccordionItem value={`item-${index}`} className="border-b-0">
                        <AccordionTrigger
                          className={cn(
                            "vf-nav-hover vf-sidebar-text-soft group flex min-h-11 items-center transition-all rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 px-3",
                            "[&>svg]:block [&[data-state=open]>svg]:rotate-180"
                          )}
                        >
                          <div className="flex w-full items-center gap-3">
                            <NavIcon icon={item.icon} />
                            <span className={cn("text-[13.5px] font-normal vf-sidebar-text-soft relative top-[0.5px]", item.title === "Avançado" && "italic opacity-80")}>
                              {item.title}
                            </span>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pb-0">
                          <div className="ml-6 mt-1.5 space-y-1.5">
                            {item.subItems?.map((subItem) => {
                              const subActive = location.pathname === subItem.href;

                              return (
                                <Link
                                  key={subItem.title}
                                  to={subItem.href || "#"}
                                  className={cn(
                                    "vf-nav-hover group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                                    subActive && "vf-nav-active ring-1 ring-primary/35"
                                  )}
                                  onClick={onCloseMobile}
                                >
                                  <NavIcon icon={subItem.icon} active={subActive} />
                                  <span className={cn("text-[13px] transition-colors relative top-[0.5px]", subActive ? "font-medium vf-sidebar-text" : "font-normal vf-sidebar-text-soft")}>
                                    {subItem.title}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </React.Fragment>
                );
              })}
            </Accordion>
          ) : (
            <div className="space-y-2">
              {navItems.map((item) => {
                const isActive = !!item.href && location.pathname === item.href;
                if (item.href) {
                  return (
                    <Link
                      key={item.title}
                      to={item.href}
                      className={cn(
                        "vf-nav-hover group flex min-h-11 items-center justify-center rounded-xl transition-all",
                        isActive && "vf-nav-active ring-1 ring-primary/35"
                      )}
                    >
                      <NavIcon icon={item.icon} active={isActive} />
                    </Link>
                  );
                }
                return (
                  <Popover
                    key={item.title}
                    open={openCollapsedMenu === item.title}
                    onOpenChange={(open) => setOpenCollapsedMenu(open ? item.title : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="vf-nav-hover group flex min-h-11 w-full items-center justify-center rounded-xl transition-all"
                        aria-label={`Abrir submenu ${item.title}`}
                        title={item.title}
                      >
                        <NavIcon icon={item.icon} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" align="start" sideOffset={10} className="z-[90] w-64 p-2">
                      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {item.title}
                      </div>
                      {item.subItems?.map((subItem) => {
                        const subActive = location.pathname === subItem.href;
                        return (
                          <Link
                            key={subItem.title}
                            to={subItem.href || "#"}
                            className={cn(
                              "vf-nav-hover flex min-h-9 items-center gap-2.5 rounded-md px-2",
                              subActive && "vf-nav-active"
                            )}
                            onClick={() => {
                              setOpenCollapsedMenu(null);
                              onCloseMobile();
                            }}
                          >
                            <NavIcon icon={subItem.icon} active={subActive} />
                            <span className={cn("text-[13px]", subActive ? "font-medium vf-sidebar-text" : "vf-sidebar-text-soft")}>
                              {subItem.title}
                            </span>
                          </Link>
                        );
                      })}
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
