import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  FaTachometerAlt,
  FaUsers,
  FaCalendarAlt,
  FaShoppingCart,
  FaFolder,
  FaPaw,
  FaPalette,
  FaDollarSign,
  FaBox,
  FaCog,
  FaSignOutAlt,
  FaMoneyBillWave,
  FaMoneyCheckAlt,
  FaSearchDollar,
  FaBoxOpen,
  FaCreditCard,
  FaTrophy,
  FaBalanceScale,
  FaFileInvoiceDollar,
  FaFileInvoice,
  FaTags,
  FaMoneyBillAlt,
  FaWallet,
  FaStethoscope,
} from "react-icons/fa";
import SystemVetLogo from "./SystemVetLogo";

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  { title: "Painel de Controle", href: "/", icon: FaTachometerAlt },
  { title: "Clientes", href: "/clients", icon: FaUsers },
  { title: "Agenda", href: "/agenda", icon: FaCalendarAlt },
  {
    title: "Vendas",
    icon: FaShoppingCart,
    subItems: [
      { title: "Ponto de venda", href: "/sales/pos", icon: FaDollarSign },
      { title: "Minhas vendas", href: "/sales/my-sales", icon: FaShoppingCart },
      { title: "Movimentos de caixa", href: "/sales/cash-movements", icon: FaMoneyBillWave },
      { title: "Consulta vendas", href: "/sales/consult-sales", icon: FaSearchDollar },
      { title: "Orçamentos", href: "/sales/budgets", icon: FaFileInvoiceDollar },
      { title: "Pacotes vendidos", href: "/sales/sold-packages", icon: FaBoxOpen },
      { title: "Recebimentos", href: "/sales/receipts", icon: FaMoneyCheckAlt },
      { title: "Lista de preços", href: "/sales/price-list", icon: FaTags },
      { title: "Ranking de clientes", href: "/sales/client-ranking", icon: FaTrophy },
      { title: "Saldo dos clientes", href: "/sales/client-balance", icon: FaBalanceScale },
      { title: "Formas de recebimento", href: "/sales/payment-methods", icon: FaCreditCard },
      { title: "Modelo de orçamento", href: "/sales/budget-model", icon: FaFileInvoiceDollar },
      { title: "Modelo de demonstrativo", href: "/sales/statement-model", icon: FaFileInvoice },
      { title: "Configuração", href: "/sales/configuration", icon: FaCog },
    ],
  },
  {
    title: "Cadastros",
    icon: FaFolder,
    subItems: [
      { title: "Espécies", href: "/registrations/species", icon: FaPaw },
      { title: "Raças", href: "/registrations/breeds", icon: FaPaw },
      { title: "Pelagens", href: "/registrations/coat-types", icon: FaPalette },
      { title: "Patologias", href: "/registrations/pathologies", icon: FaFolder },
      { title: "Tipos de atendimento", href: "/registrations/appointment-types", icon: FaFolder },
      { title: "Vacinas", href: "/registrations/vaccines", icon: FaFolder },
      { title: "Exames", href: "/registrations/exams", icon: FaFolder },
      { title: "Atributos de exames", href: "/registrations/exam-attributes", icon: FaFolder },
      { title: "Referências de exames", href: "/registrations/exam-references", icon: FaFolder },
      { title: "Modelo de receita", href: "/registrations/recipe-model", icon: FaFolder },
      { title: "Origem dos clientes", href: "/registrations/client-origins", icon: FaFolder },
      { title: "Modelo de documento", href: "/registrations/document-model", icon: FaFolder },
    ],
  },
  {
    title: "Estoque e serviços",
    icon: FaBox,
    subItems: [
      { title: "Produtos e Serviços", href: "/stock/products-services", icon: FaBox },
      { title: "Compras", href: "/stock/purchases", icon: FaBox },
      { title: "Outras saídas de estoque", href: "/stock/other-exits", icon: FaBox },
      { title: "Análise de estoque", href: "/stock/stock-analysis", icon: FaBox },
      { title: "Inventário", href: "/stock/inventory", icon: FaBox },
      { title: "Pedido de compra", href: "/stock/purchase-order", icon: FaBox },
      { title: "Grupos de Produtos", href: "/stock/product-groups", icon: FaBox },
      { title: "Marcas", href: "/stock/brands", icon: FaBox },
      { title: "Produtos recomendados", href: "/stock/recommended-products", icon: FaBox },
    ],
  },
  {
    title: "Financeiro",
    icon: FaMoneyBillWave,
    subItems: [
      { title: "Visão geral", href: "/financial", icon: FaMoneyBillWave },
      { title: "Contas a receber", href: "/financial/accounts-receivable", icon: FaMoneyBillAlt },
      { title: "Recebimentos", href: "/financial/receipts", icon: FaMoneyCheckAlt },
      { title: "Caixa / Movimentações", href: "/financial/cash-movements", icon: FaWallet },
    ],
  },
  {
    title: "Configuração",
    icon: FaCog,
    subItems: [
      { title: "Empresa", href: "/settings/company", icon: FaCog },
      { title: "Usuários", href: "/settings/user", icon: FaUsers },
      { title: "Acesso externo", href: "/settings/external-access", icon: FaCog },
      { title: "Perfil de Acesso", href: "/settings/access-profile", icon: FaCog },
    ],
  },
  { title: "Sair", href: "/logout", icon: FaSignOutAlt },
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
        "h-9 w-9 rounded-xl flex items-center justify-center ring-1 transition-colors",
        active ? "bg-sidebar-primary text-primary ring-sidebar-border" : "bg-sidebar-accent/60 text-sidebar-foreground/80 ring-sidebar-border",
        "group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
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
        <div
          className={cn(
            "h-14 flex items-center border-b border-sidebar-border mb-4",
            isDesktopOpen ? "px-2 justify-start" : "px-0 justify-center"
          )}
        >
          {isDesktopOpen ? <SystemVetLogo /> : <FaStethoscope className="h-5 w-5 text-sidebar-foreground/80" />}
        </div>

        <nav className="space-y-1.5">
          <Accordion type="multiple" className="w-full">
            {navItems.map((item, index) => {
              const isActive = !!item.href && location.pathname === item.href;

              return (
                <React.Fragment key={item.title}>
                  {item.href ? (
                    <Link
                      to={item.href}
                      className={cn(
                        "group flex items-center rounded-xl h-11 transition-colors",
                        isDesktopOpen ? "px-2 gap-3 justify-start" : "px-0 gap-0 justify-center",
                        isActive ? "bg-sidebar-primary/60" : "hover:bg-sidebar-accent"
                      )}
                      onClick={onCloseMobile}
                    >
                      <IconBox active={isActive}>
                        <item.icon className="h-[18px] w-[18px]" />
                      </IconBox>
                      {isDesktopOpen && (
                        <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-sidebar-foreground")}>{item.title}</span>
                      )}
                    </Link>
                  ) : (
                    <AccordionItem value={`item-${index}`} className="border-b-0">
                      <AccordionTrigger
                        className={cn(
                          "group flex items-center rounded-xl h-11 transition-colors hover:bg-sidebar-accent",
                          isDesktopOpen ? "px-2" : "px-0",
                          isDesktopOpen ? "[&>svg]:block [&[data-state=open]>svg]:rotate-180" : "[&>svg]:hidden"
                        )}
                      >
                        <div className={cn("flex items-center", isDesktopOpen ? "gap-3" : "gap-0", isDesktopOpen ? "w-full" : "justify-center")}
                        >
                          <IconBox>
                            <item.icon className="h-[18px] w-[18px]" />
                          </IconBox>
                          {isDesktopOpen && <span className="text-sm font-medium text-sidebar-foreground">{item.title}</span>}
                        </div>
                      </AccordionTrigger>

                      {isDesktopOpen && (
                        <AccordionContent className="pb-0">
                          <div className="ml-11 mt-1 space-y-1">
                            {item.subItems?.map((subItem) => {
                              const subActive = location.pathname === subItem.href;
                              return (
                                <Link
                                  key={subItem.title}
                                  to={subItem.href || "#"}
                                  className={cn(
                                    "group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors",
                                    subActive ? "bg-sidebar-primary/50" : "hover:bg-sidebar-accent"
                                  )}
                                  onClick={onCloseMobile}
                                >
                                  <IconBox active={subActive}>
                                    {subItem.icon ? <subItem.icon className="h-[16px] w-[16px]" /> : <FaFolder className="h-[16px] w-[16px]" />}
                                  </IconBox>
                                  <span className={cn("text-sm", subActive ? "font-semibold text-primary" : "text-sidebar-foreground/90")}
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