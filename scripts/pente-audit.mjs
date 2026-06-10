import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.AUDIT_BASE_URL || "http://localhost:8082";
const OUTPUT_DIR = path.resolve("test-results/route-audit");
const routes = ["/sales/my-sales", "/sales/pos", "/financial"];

const slugify = (route) => route.replace(/^\//, "").replace(/\//g, "-");

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1024 } });
  const page = await context.newPage();

  for (const route of routes) {
    const slug = slugify(route);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await wait(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `pente-${slug}-light.png`), fullPage: true });

    const toggle = page.getByRole("button", { name: /Alternar tema/i }).first();
    if ((await toggle.count()) > 0) {
      await toggle.click();
      await wait(350);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `pente-${slug}-dark.png`), fullPage: true });
      await toggle.click();
      await wait(200);
    }
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
