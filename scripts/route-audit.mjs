import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:8080";
const OUTPUT_DIR = path.resolve("test-results/route-audit");
const ROUTE_LIMIT = Number(process.env.ROUTE_LIMIT || "0");

const routes = [
  "/",
  "/dashboard",
  "/clients",
  "/clients/add",
  "/clients/1/edit",
  "/animals/add",
  "/clients/1",
  "/agenda",
  "/help",
  "/sales/pos",
  "/sales/my-sales",
  "/sales/reports",
  "/sales/budgets",
  "/sales/receipts",
  "/sales/sold-packages",
  "/sales/statement-model",
  "/sales/client-financial",
  "/financial",
  "/financial/reports",
  "/financial/transactions",
  "/financial/card-reconciliation",
  "/financial/accounts-payable",
  "/financial/statement",
  "/financial/cash-flow",
  "/financial/accounts-cards",
  "/financial/categories",
  "/financial/suppliers",
  "/financial/payment-methods",
  "/stock/products-services",
  "/stock/purchases",
  "/stock/other-exits",
  "/stock/stock-analysis",
  "/stock/inventory",
  "/stock/purchase-order",
  "/stock/product-groups",
  "/stock/brands",
  "/stock/recommended-products",
  "/registrations/species",
  "/registrations/breeds",
  "/registrations/coat-types",
  "/registrations/exam-references",
  "/registrations/pathologies",
  "/registrations/exam-attributes",
  "/registrations/client-origins",
  "/registrations/recipe-model",
  "/registrations/appointment-types",
  "/registrations/vaccines",
  "/registrations/exams",
  "/registrations/document-model",
  "/settings/company",
  "/settings/user",
  "/settings/external-access",
  "/settings/access-profile",
];

const slugify = (route) =>
  route
    .replace(/^\//, "")
    .replace(/\//g, "-")
    .replace(/[^a-zA-Z0-9\-]/g, "")
    .replace(/-+/g, "-") || "home";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRelevantRuntimeError = (text) => {
  const normalized = String(text || "");
  if (!normalized) return false;
  if (/ReferenceError|SyntaxError|Unhandled/i.test(normalized)) return true;
  if (/TypeError/i.test(normalized) && /assets\/index|assets\/vendor/i.test(normalized)) return true;
  return false;
};

async function validateDarkMode(page) {
  const before = await page.evaluate(() => ({
    className: document.documentElement.className || "",
    dataTheme: document.documentElement.getAttribute("data-theme") || "",
  }));
  const toggle = page.getByRole("button", { name: /Alternar tema/i }).first();
  if ((await toggle.count()) === 0) return "falha";
  await toggle.click({ timeout: 3000 });
  await wait(350);
  const after = await page.evaluate(() => ({
    className: document.documentElement.className || "",
    dataTheme: document.documentElement.getAttribute("data-theme") || "",
  }));
  await toggle.click({ timeout: 3000 });
  return before.className !== after.className || before.dataTheme !== after.dataTheme ? "ok" : "falha";
}

async function run() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();

  let currentRoute = "";
  const routeErrors = new Map();
  page.on("pageerror", (err) => {
    const list = routeErrors.get(currentRoute) || [];
    list.push(`pageerror: ${err.message || "erro desconhecido"}`);
    routeErrors.set(currentRoute, list);
  });
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (!isRelevantRuntimeError(text)) return;
    const list = routeErrors.get(currentRoute) || [];
    list.push(`console: ${text}`);
    routeErrors.set(currentRoute, list);
  });

  const rows = [];
  const targetRoutes = ROUTE_LIMIT > 0 ? routes.slice(0, ROUTE_LIMIT) : routes;
  for (let i = 0; i < targetRoutes.length; i += 1) {
    const route = targetRoutes[i];
    const slug = slugify(route);
    const index = String(i + 1).padStart(2, "0");
    currentRoute = route;
    routeErrors.set(route, []);

    try {
      console.log(`Auditing ${i + 1}/${targetRoutes.length}: ${route}`);
      await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await wait(900);

      const lightPath = path.join(OUTPUT_DIR, `route-${index}-${slug}-light.png`);
      await page.screenshot({ path: lightPath, fullPage: true });

      let darkMode = "falha";
      let darkPath = "";
      try {
        darkMode = await validateDarkMode(page);
        if (darkMode === "ok") {
          darkPath = path.join(OUTPUT_DIR, `route-${index}-${slug}-dark.png`);
          await page.screenshot({ path: darkPath, fullPage: true });
        }
      } catch {
        darkMode = "falha";
      }

      const errors = (routeErrors.get(route) || []).filter(Boolean);
      rows.push({
        route,
        screenshot_light_path: lightPath,
        screenshot_dark_path: darkPath || "-",
        runtime_error: errors.length ? `sim: ${errors[0]}` : "nao",
        dark_mode: darkMode,
      });
      console.log(`OK: ${route}`);
    } catch (err) {
      rows.push({
        route,
        screenshot_light_path: "",
        screenshot_dark_path: "",
        runtime_error: `sim: ${err instanceof Error ? err.message : String(err)}`,
        dark_mode: "falha",
      });
      console.log(`FAIL: ${route}`);
    }
  }

  await browser.close();

  const jsonPath = path.join(OUTPUT_DIR, "audit-results.json");
  await fs.writeFile(jsonPath, JSON.stringify(rows, null, 2), "utf8");

  const header =
    "| rota | screenshot_light_path | screenshot_dark_path | runtime_error | dark_mode |\n|---|---|---|---|---|";
  const body = rows
    .map(
      (r) =>
        `| ${r.route} | ${r.screenshot_light_path || "-"} | ${r.screenshot_dark_path || "-"} | ${r.runtime_error.replace(/\|/g, "/")} | ${r.dark_mode} |`
    )
    .join("\n");
  const markdownPath = path.join(OUTPUT_DIR, "audit-results.md");
  await fs.writeFile(markdownPath, `${header}\n${body}\n`, "utf8");

  console.log(`Audit done. JSON: ${jsonPath}`);
  console.log(`Audit done. Markdown: ${markdownPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
