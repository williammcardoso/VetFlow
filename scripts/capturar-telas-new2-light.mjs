import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:8082";
const OUTPUT_DIR = path.resolve("test-results/route-audit/NEW2");

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

async function autoScrollAndStabilize(page) {
  let sameHeightCount = 0;
  let previousHeight = 0;

  for (let i = 0; i < 40; i += 1) {
    const currentHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      return Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html.clientHeight,
        html.scrollHeight,
        html.offsetHeight
      );
    });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(220);

    if (currentHeight === previousHeight) {
      sameHeightCount += 1;
    } else {
      sameHeightCount = 0;
    }
    previousHeight = currentHeight;

    if (sameHeightCount >= 3) break;
  }
}

async function waitDataLoaded(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 18000 }).catch(() => {});
  await wait(600);

  await page
    .waitForFunction(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };

      const busySelectors = [
        ".animate-pulse",
        "[aria-busy='true']",
        "[data-loading='true']",
        ".loading",
        ".loader",
        ".spinner",
      ];
      const busyElements = document.querySelectorAll(busySelectors.join(","));
      const hasVisibleBusy = Array.from(busyElements).some((el) => isVisible(el));
      if (hasVisibleBusy) return false;

      const hasLoadingText = Array.from(document.querySelectorAll("body *")).some((el) => {
        if (!isVisible(el)) return false;
        const text = (el.textContent || "").trim().toLowerCase();
        if (!text) return false;
        if (text.length > 80) return false;
        return /^(carregando|loading)(\.\.\.)?$/.test(text) || text.includes("carregando...");
      });

      return !hasLoadingText;
    }, { timeout: 25000 })
    .catch(() => {});
}

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
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
      await waitDataLoaded(page);
      await autoScrollAndStabilize(page);
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
