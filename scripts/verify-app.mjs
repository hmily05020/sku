import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");
await page.screenshot({ path: "C:/Users/我是好人/wenan/roi-system/verification-overview.png", fullPage: true });

const summary = await page.evaluate(() => ({
  title: document.querySelector("h1")?.textContent,
  visibleRows: document.querySelectorAll("#skuTableBody tr").length,
  skuCount: document.querySelector("#metricSkuCount")?.textContent,
  calcCount: document.querySelector("#metricCalculatedCount")?.textContent,
  missingCount: document.querySelector("#metricMissingCount")?.textContent,
}));

await page.click('[data-view="calculator"]');
await page.fill("#calcSpec", "88g*1+15.6g*4");
await page.click("#parseSpecBtn");
await page.fill("#calcPrice", "88");
await page.fill("#oldPrice", "78");
await page.fill("#newPrice", "88");
await page.screenshot({ path: "C:/Users/我是好人/wenan/roi-system/verification-calculator.png", fullPage: true });

const calc = await page.evaluate(() => ({
  roiNet: document.querySelector("#roiNetResult")?.textContent,
  roiRefund: document.querySelector("#roiRefundResult")?.textContent,
  margin: document.querySelector("#marginResult")?.textContent,
  productCost: document.querySelector("#productCostResult")?.textContent,
  compare: document.querySelector("#compareOutput")?.textContent?.replace(/\s+/g, " ").trim(),
  components: [...document.querySelectorAll(".component-row")].map((row) => ({
    name: row.querySelector('[data-field="name"]')?.value,
    quantity: row.querySelector('[data-field="quantity"]')?.value,
    unitCost: row.querySelector('[data-field="unitCost"]')?.value,
  })),
}));

await page.click('[data-view="costs"]');
const costs = await page.evaluate(() => ({
  rows: document.querySelectorAll("#costTableBody tr").length,
  has88g: [...document.querySelectorAll("#costTableBody tr")].some((row) => row.textContent.includes("88g")),
  has156g: [...document.querySelectorAll("#costTableBody tr")].some((row) => row.textContent.includes("15.6g")),
}));

await page.screenshot({ path: "C:/Users/我是好人/wenan/roi-system/verification-costs.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ summary, calc, costs }, null, 2));
