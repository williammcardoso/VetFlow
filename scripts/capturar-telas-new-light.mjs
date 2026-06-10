import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:8082";
const OUTPUT_DIR = path.resolve("test-results/route-audit/NEW");

const pages = [
  { route: "/", name: "inicio" },
  { route: "/dashboard", name: "painel-de-controle" },
  { route: "/clients", name: "clientes" },
  { route: "/clients/add", name: "adicionar-cliente" },
  { route: "/clients/1/edit", name: "editar-cliente" },
  { route: "/animals/add", name: "adicionar-animal" },
  { route: "/clients/1", name: "detalhe-do-cliente" },
  { route: "/agenda", name: "agenda" },
  { route: "/help", name: "ajuda" },
  { route: "/sales/pos", name: "pdv" },
  { route: "/sales/my-sales", name: "minhas-vendas" },
  { route: "/sales/reports", name: "relatorio-de-vendas" },
  { route: "/sales/budgets", name: "orcamentos" },
  { route: "/sales/receipts", name: "recebimentos" },
  { route: "/sales/sold-packages", name: "pacotes-vendidos" },
  { route: "/sales/statement-model", name: "modelo-de-demonstrativo" },
  { route: "/sales/client-financial", name: "financeiro-de-clientes" },
  { route: "/financial", name: "visao-geral-financeira" },
  { route: "/financial/reports", name: "relatorios-financeiros" },
  { route: "/financial/transactions", name: "transacoes" },
  { route: "/financial/card-reconciliation", name: "conciliacao-de-cartao" },
  { route: "/financial/accounts-payable", name: "contas-a-pagar" },
  { route: "/financial/statement", name: "demonstrativo-financeiro" },
  { route: "/financial/cash-flow", name: "fluxo-de-caixa" },
  { route: "/financial/accounts-cards", name: "contas-e-cartoes" },
  { route: "/financial/categories", name: "categorias-financeiras" },
  { route: "/financial/suppliers", name: "fornecedores" },
  { route: "/financial/payment-methods", name: "formas-de-pagamento" },
  { route: "/stock/products-services", name: "produtos-e-servicos" },
  { route: "/stock/purchases", name: "compras-de-estoque" },
  { route: "/stock/other-exits", name: "outras-saidas" },
  { route: "/stock/stock-analysis", name: "analise-de-estoque" },
  { route: "/stock/inventory", name: "inventario" },
  { route: "/stock/purchase-order", name: "pedido-de-compra" },
  { route: "/stock/product-groups", name: "grupos-de-produtos" },
  { route: "/stock/brands", name: "marcas" },
  { route: "/stock/recommended-products", name: "produtos-recomendados" },
  { route: "/registrations/species", name: "cadastro-de-especies" },
  { route: "/registrations/breeds", name: "cadastro-de-racas" },
  { route: "/registrations/coat-types", name: "cadastro-de-pelagens" },
  { route: "/registrations/exam-references", name: "referencias-de-exames" },
  { route: "/registrations/pathologies", name: "patologias" },
  { route: "/registrations/exam-attributes", name: "atributos-de-exames" },
  { route: "/registrations/client-origins", name: "origem-de-clientes" },
  { route: "/registrations/recipe-model", name: "modelo-de-receita" },
  { route: "/registrations/appointment-types", name: "tipos-de-atendimento" },
  { route: "/registrations/vaccines", name: "vacinas" },
  { route: "/registrations/exams", name: "exames" },
  { route: "/registrations/document-model", name: "modelo-de-documento" },
  { route: "/settings/company", name: "configuracoes-da-empresa" },
  { route: "/settings/user", name: "configuracoes-do-usuario" },
  { route: "/settings/external-access", name: "acesso-externo" },
  { route: "/settings/access-profile", name: "perfis-de-acesso" },
];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();

  const failures = [];

  for (let i = 0; i < pages.length; i += 1) {
    const item = pages[i];
    const index = String(i + 1).padStart(2, "0");
    const fileName = `${index}-${item.name}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    try {
      await page.goto(`${BASE_URL}${item.route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await wait(700);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`OK ${index}/${pages.length}: ${item.route} -> ${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ route: item.route, file: fileName, error: message });
      console.log(`FAIL ${index}/${pages.length}: ${item.route} -> ${fileName}`);
    }
  }

  await browser.close();

  if (failures.length > 0) {
    const reportPath = path.join(OUTPUT_DIR, "falhas-captura.json");
    await fs.writeFile(reportPath, JSON.stringify(failures, null, 2), "utf8");
    console.log(`Captura finalizada com falhas. Relatorio: ${reportPath}`);
    process.exit(1);
  }

  console.log(`Captura concluida com sucesso. Arquivos em: ${OUTPUT_DIR}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
