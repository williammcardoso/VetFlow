import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:4174";
const OUTPUT_DIR = path.resolve("test-results/route-audit/NEW2");
const FAILURES_PATH = path.join(OUTPUT_DIR, "falhas-captura.json");

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

    if (currentHeight === previousHeight) sameHeightCount += 1;
    else sameHeightCount = 0;
    previousHeight = currentHeight;
    if (sameHeightCount >= 3) break;
  }
}

async function waitDataLoaded(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await wait(900);
  await page
    .waitForFunction(() => {
      const isVisible = (el) => {
        if (!el) return false;
        const s = window.getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };
      const busy = document.querySelectorAll(
        ".animate-pulse, [aria-busy='true'], [data-loading='true'], .loading, .loader, .spinner"
      );
      return !Array.from(busy).some((el) => isVisible(el));
    }, { timeout: 30000 })
    .catch(() => {});
}

async function run() {
  const raw = await fs.readFile(FAILURES_PATH, "utf8");
  const failures = JSON.parse(raw);
  if (!Array.isArray(failures) || failures.length === 0) {
    console.log("Sem falhas para retry.");
    return;
  }

  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();

  const unresolved = [];

  for (let i = 0; i < failures.length; i += 1) {
    const item = failures[i];
    const filePath = path.join(OUTPUT_DIR, item.file);
    try {
      await page.goto(`${BASE_URL}${item.route}`, { waitUntil: "domcontentloaded", timeout: 90000 });
      await waitDataLoaded(page);
      await autoScrollAndStabilize(page);
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`OK retry ${i + 1}/${failures.length}: ${item.route}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      unresolved.push({ route: item.route, file: item.file, error: message });
      console.log(`FAIL retry ${i + 1}/${failures.length}: ${item.route}`);
    }
  }

  await browser.close();

  if (unresolved.length > 0) {
    await fs.writeFile(FAILURES_PATH, JSON.stringify(unresolved, null, 2), "utf8");
    console.log(`Retry finalizado com falhas remanescentes: ${unresolved.length}`);
    process.exit(1);
  }

  await fs.unlink(FAILURES_PATH).catch(() => {});
  console.log("Retry concluido. Todas as falhas foram capturadas.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
