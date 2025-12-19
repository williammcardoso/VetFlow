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
  FaTachometerAlt, FaUsers, FaCalendarAlt, FaShoppingCart, FaFolder, FaPaw, FaPalette, FaDollarSign, FaBox, FaCog, FaSignOutAlt, FaMoneyBillWave, FaMoneyCheckAlt, FaSearchDollar, FaBoxOpen, FaCreditCard, FaTrophy, FaBalanceScale, FaFileInvoiceDollar, FaFileInvoice, FaTruck, FaExchangeAlt, FaTags, FaMoneyBillAlt, FaChartBar, FaWallet, FaChevronLeft, FaChevronRight, FaStethoscope
} from "react-icons/fa"; // Importar ícones de react-icons
import SystemVetLogo from "./SystemVetLogo"; // Importar o novo componente de logo
import { Button } from "@/components/ui/button"; // Importar Button

interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: "Painel de Controle",
    href: "/",
    icon: FaTachometerAlt,
  },
  {
    title: "Clientes",
    href: "/clients",
    icon: FaUsers,
  },
  {
    title: "Agenda",
    href: "/agenda", // Link atualizado para a nova página de Agenda
    icon: FaCalendarAlt,
  },
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
      { title: "Patologias", href: "/registrations/pathologies" },
      { title: "Tipos de atendimento", href: "/registrations/appointment-types" },
      { title: "Vacinas", href: "/registrations/vaccines" },
      { title: "Exames", href: "/registrations/exams" },
      { title: "Atributos de exames", href: "/registrations/exam-attributes" },
      { title: "Referências de exames", href: "/registrations/exam-references" },
      { title: "Modelo de receita", href: "/registrations/recipe-model" },
      { title: "Origem dos clientes", href: "/registrations/client-origins" },
      { title: "Modelo de documento", href: "/registrations/document-model" },
    ],
  },
  {
    title: "Estoque e serviços",
    icon: FaBox,
    subItems: [
      { title: "Produtos e Serviços", href: "/stock/products-services" },
      { title: "Compras", href: "/stock/purchases" },
      { title: "Outras saídas de estoque", href: "/stock/other-exits" },
      { title: "Análise de estoque", href: "/stock/stock-analysis" },
      { title: "Inventário", href: "/stock/inventory" },
      { title: "Pedido de compra", href: "/stock/purchase-order" },
      { title: "Grupos de Produtos", href: "/stock/product-groups" },
      { title: "Marcas", href: "/stock/brands" },
      { title: "Produtos recomendados", href: "/stock/recommended-products" },
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
      { title: "Empresa", href: "/settings/company" },
      { title: "Usuários", href: "/settings/user" },
      { title: "Acesso externo", href: "/settings/external-access" },
      { title: "Perfil de Acesso", href: "/settings/access-profile" },
    ],
  },
  {
    title: "Sair",
    href: "/logout",
    icon: FaSignOutAlt,
  },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isDesktopOpen: boolean; // Nova prop para o estado do sidebar desktop
  onToggleDesktop: () => void; // Nova prop para o toggle do desktop
}

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile, isDesktopOpen, onToggleDesktop }) => {
  const location = useLocation();

  return (
    <>
      {/* Overlay para mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onCloseMobile}
        ></div>
      )}

      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground h-screen fixed left-0 top-0 overflow-y-auto border-r border-sidebar-border p-4 shadow-lg transition-all duration-300 ease-in-out z-50 hide-scrollbar",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full",
          isDesktopOpen ? "lg:translate-x-0 lg:w-64" : "lg:translate-x-0 lg:w-16"
        )}
      >
        <div className={cn(
          "flex items-center h-16 border-b border-sidebar-border mb-4 px-3",
          isDesktopOpen ? "justify-start" : "justify-center"
        )}>
          {isDesktopOpen ? (
            <SystemVetLogo />
          ) : (
            <FaStethoscope className="h-6 w-6 text-white" /> // Ícone menor quando recolhido
          )}
        </div>
        <nav className="space-y-1">
          <Accordion type="multiple" className="w-full">
            {navItems.map((item, index) => (
              <React.Fragment key={item.title}>
                {item.href ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      location.pathname === item.href && "bg-sidebar-primary text-sidebar-primary-foreground font-medium",
                      !isDesktopOpen && "justify-center" // Centraliza ícone quando recolhido
                    )}
                    onClick={onCloseMobile}
                  >
                    <item.icon className="h-4 w-4" />
                    {isDesktopOpen && item.title}
                  </Link>
                ) : (
                  <AccordionItem value={`item-${index}`} className="border-b-0">
                    <AccordionTrigger className={cn(
                      "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      // Controla a visibilidade do chevron padrão do AccordionTrigger
                      isDesktopOpen ? "[&>svg]:block [&[data-state=open]>svg]:rotate-180" : "[&>svg]:hidden",
                      "font-normal",
                      location.pathname.startsWith(item.subItems?.[0]?.href?.split('/')[1] || "") && "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
                      !isDesktopOpen && "justify-center" // Centraliza ícone quando recolhido
                    )}>
                      <div className={cn("flex items-center gap-3", !isDesktopOpen && "justify-center w-full")}>
                        <item.icon className="h-4 w-4" />
                        {isDesktopOpen && item.title}
                      </div>
                      {/* O chevron padrão do AccordionTrigger agora é controlado pela classe acima */}
                    </AccordionTrigger>
                    {isDesktopOpen && ( // Renderiza sub-itens apenas se o sidebar estiver aberto
                      <AccordionContent className="pb-0">
                        <div className="ml-6 space-y-1">
                          {item.subItems?.map((subItem) => (
                            <Link
                              key={subItem.title}
                              to={subItem.href || "#"}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                                location.pathname === subItem.href && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                              )}
                              onClick={onCloseMobile}
                            >
                              {subItem.icon && <subItem.icon className="h-4 w-4" />}
                              {subItem.title}
                            </Link>
                          ))}
                        </div>
                      </AccordionContent>
                    )}
                  </AccordionItem>
                )}
              </React.Fragment>
            ))}
          </Accordion>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;