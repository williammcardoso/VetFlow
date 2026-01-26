import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import SystemVetLogo from "./SystemVetLogo";
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Folder,
  LayoutDashboard,
  LogOut,
  Package,
  PawPrint,
  Receipt,
  Search,
  Settings,
  ShoppingCart,
  Stethoscope,
  Tag,
  Trophy,
  Users,
  Wallet,
  Scale,
  ClipboardList,
} from "lucide-react";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { title: "Painel de Controle", href: "/", icon: LayoutDashboard },
  { title: "Clientes", href: "/clients", icon: Users },
  { title: "Agenda", href: "/agenda", icon: Calendar },
  {
    title: "Vendas",
    icon: ShoppingCart,
    subItems: [
      { title: "Ponto de venda", href: "/sales/pos", icon: DollarSign },
      { title: "Minhas vendas", href: "/sales/my-sales", icon: Receipt },
      { title: "Movimentos de caixa", href: "/sales/cash-movements", icon: Wallet },
      { title: "Consulta vendas", href: "/sales/consult-sales", icon: Search },
      { title: "Orçamentos", href: "/sales/budgets", icon: FileText },
      { title: "Pacotes vendidos", href: "/sales/sold-packages", icon: Package },
      { title: "Recebimentos", href: "/sales/receipts", icon: Receipt },
      { title: "Lista de preços", href: "/sales/price-list", icon: Tag },
      { title: "Ranking de clientes", href: "/sales/client-ranking", icon: Trophy },
      { title: "Saldo dos clientes", href: "/sales/client-balance", icon: Scale },
      { title: "Formas de recebimento", href: "/sales/payment-methods", icon: CreditCard },
      { title: "Modelo de orçamento", href: "/sales/budget-model", icon: FileText },
      { title: "Modelo de demonstrativo", href: "/sales/statement-model", icon: FileText },
      { title: "Configuração", href: "/sales/configuration", icon: Settings },
    ],
  },
  {
    title: "Cadastros",
    icon: Folder,
    subItems: [
      { title: "Espécies", href: "/registrations/species", icon: PawPrint },
      { title: "Raças", href: "/registrations/breeds", icon: PawPrint },
      { title: "Pelagens", href: "/registrations/coat-types", icon: PawPrint },
      { title: "Patologias", href: "/registrations/pathologies", icon: Folder },
      { title: "Tipos de atendimento", href: "/registrations/appointment-types", icon: ClipboardList },
      { title: "Vacinas", href: "/registrations/vaccines", icon: ClipboardList },
      { title: "Exames", href: "/registrations/exams", icon: ClipboardList },
      { title: "Atributos de exames", href: "/registrations/exam-attributes", icon: ClipboardList },
      { title: "Referências de exames", href: "/registrations/exam-references", icon: ClipboardList },
      { title: "Modelo de receita", href: "/registrations/recipe-model", icon: FileText },
      { title: "Origem dos clientes", href: "/registrations/client-origins", icon: Users },
      { title: "Modelo de documento", href: "/registrations/document-model", icon: FileText },
    ],
  },
  {
    title: "Estoque e serviços",
    icon: Package,
    subItems: [
      { title: "Produtos e Serviços", href: "/stock/products-services", icon: Package },
      { title: "Compras", href: "/stock/purchases", icon: ShoppingCart },
      { title: "Outras saídas de estoque", href: "/stock/other-exits", icon: Package },
      { title: "Análise de estoque", href: "/stock/stock-analysis", icon: Search },
      { title: "Inventário", href: "/stock/inventory", icon: Package },
      { title: "Pedido de compra", href: "/stock/purchase-order", icon: FileText },
      { title: "Grupos de Produtos", href: "/stock/product-groups", icon: Folder },
      { title: "Marcas", href: "/stock/brands", icon: Tag },
      { title: "Produtos recomendados", href: "/stock/recommended-products", icon: Package },
    ],
  },
  {
    title: "Financeiro",
    icon: Wallet,
    subItems: [
      { title: "Visão geral", href: "/financial", icon: Wallet },
      { title: "Contas a receber", href: "/financial/accounts-receivable", icon: DollarSign },
      { title: "Recebimentos", href: "/financial/receipts", icon: Receipt },
      { title: "Caixa / Movimentações", href: "/financial/cash-movements", icon: Wallet },
    ],
  },
  {
    title: "Configuração",
    icon: Settings,
    subItems: [
      { title: "Empresa", href: "/settings/company", icon: Settings },
      { title: "Usuários", href: "/settings/user", icon: Users },
      { title: "Acesso externo", href: "/settings/external-access", icon: Settings },
      { title: "Perfil de Acesso", href: "/settings/access-profile", icon: Settings },
    ],
  },
  { title: "Sair", href: "/logout", icon: LogOut },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isDesktopOpen: boolean;
  onToggleDesktop: () => void;
}

function IconBox({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
        "ring-1 ring-border/70",
        active
          ? "bg-emerald-50 text-emerald-700"
          : "bg-muted/50 text-muted-foreground group-hover:bg-muted group-hover:text-foreground/80"
      )}
    >
      {children}
    </span>
  );
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile, isDesktopOpen }) => {
  const location = useLocation();

  return (
    <>
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onCloseMobile} />
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground h-screen fixed left-0 top-0 overflow-y-auto border-r border-sidebar-border",
          "px-3 py-4 shadow-sm transition-all duration-300 ease-in-out z-50 hide-scrollbar",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full",
          isDesktopOpen ? "lg:translate-x-0 lg:w-64" : "lg:translate-x-0 lg:w-16"
        )}
      >
        <div className={cn("h-14 flex items-center", isDesktopOpen ? "px-2" : "px-0 justify-center")}>
          {isDesktopOpen ? (
            <SystemVetLogo />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-muted/50 ring-1 ring-border/70 flex items-center justify-center text-muted-foreground">
              <Stethoscope className="h-[18px] w-[18px]" />
            </div>
          )}
        </div>

        <nav className="mt-3 space-y-2">
          <Accordion type="multiple" className="w-full">
            {navItems.map((item, index) => {
              const isActive = !!item.href && location.pathname === item.href;
              const Icon = item.icon;

              return (
                <React.Fragment key={item.title}>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className={cn(
                        "group flex items-center rounded-xl h-12 transition-colors",
                        "hover:bg-muted/70",
                        isDesktopOpen ? "px-2 gap-3 justify-start" : "px-0 gap-0 justify-center",
                        isActive && "bg-emerald-50"
                      )}
                      onClick={onCloseMobile}
                    >
                      <IconBox active={isActive}>
                        <Icon className="h-[18px] w-[18px]" />
                      </IconBox>
                      {isDesktopOpen && (
                        <span
                          className={cn(
                            "text-[13.5px] leading-none",
                            isActive ? "font-medium text-emerald-800" : "font-normal text-foreground/70",
                            "group-hover:text-foreground/90"
                          )}
                        >
                          {item.title}
                        </span>
                      )}
                    </Link>
                  ) : (
                    <AccordionItem value={`item-${index}`} className="border-b-0">
                      <AccordionTrigger
                        className={cn(
                          "group flex items-center rounded-xl h-12 transition-colors hover:bg-muted/70",
                          isDesktopOpen ? "px-2" : "px-0",
                          isDesktopOpen
                            ? "[&>svg]:block [&[data-state=open]>svg]:rotate-180"
                            : "[&>svg]:hidden"
                        )}
                      >
                        <div
                          className={cn(
                            "flex items-center",
                            isDesktopOpen ? "gap-3 w-full" : "gap-0 justify-center"
                          )}
                        >
                          <IconBox>
                            <Icon className="h-[18px] w-[18px]" />
                          </IconBox>
                          {isDesktopOpen && (
                            <span className="text-[13.5px] font-normal text-foreground/70 group-hover:text-foreground/90">
                              {item.title}
                            </span>
                          )}
                        </div>
                      </AccordionTrigger>

                      {isDesktopOpen && (
                        <AccordionContent className="pb-0">
                          <div className="ml-11 mt-1.5 space-y-1.5">
                            {item.subItems?.map((subItem) => {
                              const subActive = location.pathname === subItem.href;
                              const SubIcon = subItem.icon;

                              return (
                                <Link
                                  key={subItem.title}
                                  to={subItem.href || "#"}
                                  className={cn(
                                    "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                                    "hover:bg-muted/70",
                                    subActive && "bg-emerald-50"
                                  )}
                                  onClick={onCloseMobile}
                                >
                                  <IconBox active={subActive}>
                                    <SubIcon className="h-[16px] w-[16px]" />
                                  </IconBox>
                                  <span
                                    className={cn(
                                      "text-[13px]",
                                      subActive
                                        ? "font-medium text-emerald-800"
                                        : "font-normal text-foreground/70",
                                      "group-hover:text-foreground/90"
                                    )}
                                  >
                                    {subItem.title}
                                  </span>
                                </Link>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      )}
                    </AccordionItem>
                  )}
                </React.Fragment>
              );
            })}
          </Accordion>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;