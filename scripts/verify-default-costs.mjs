import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.clear();
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");

const result = await page.evaluate(() => {
  const rows = [...document.querySelectorAll("#skuTableBody tr")].slice(0, 5).map((tr) => {
    const cells = [...tr.children].map((td) => td.textContent.trim());
    return {
      product: cells[1],
      sku: cells[2],
      cost: cells[5],
      status: cells[9],
    };
  });
  const costs = JSON.parse(localStorage.getItem("roiSystemCostRows") || "[]");
  return {
    calculated: document.querySelector("#metricCalculatedCount")?.textContent,
    missing: document.querySelector("#metricMissingCount")?.textContent,
    hasGeneral88: costs.some((row) => row.product === "通用" && row.component === "88g"),
    hasGeneral98: costs.some((row) => row.product === "通用" && row.component === "98g"),
    rows,
  };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
