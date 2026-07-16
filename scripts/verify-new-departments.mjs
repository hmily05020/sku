import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  localStorage.removeItem("roiSystemDeletedSkuIds");
});
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");

const result = await page.evaluate(() => {
  const options = [...document.querySelectorAll("#departmentFilter option")].map((option) => option.value);
  const stored = JSON.parse(localStorage.getItem("roiSystemSkus") || "[]");
  const counts = {};
  for (const row of stored) counts[row.department] = (counts[row.department] || 0) + 1;
  return {
    metricSkuCount: document.querySelector("#metricSkuCount")?.textContent,
    options,
    counts,
    sevenSample: stored.filter((row) => row.department === "七部").slice(0, 3).map((row) => ({
      productName: row.productName,
      sku: row.sku,
      price: row.price,
    })),
    threeSample: stored.filter((row) => row.department === "三部").slice(0, 3).map((row) => ({
      productName: row.productName,
      sku: row.sku,
      price: row.price,
    })),
  };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
