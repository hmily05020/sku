import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const dataScript = document.createElement("script");
  dataScript.textContent = "";
  document.body.appendChild(dataScript);
});

const allSkus = await page.evaluate(async () => {
  const data = await fetch("/src/data.json").then((res) => res.json());
  return data.currentSkus;
});
const stale = allSkus.filter((row) => !row.productName.includes("88g咖啡糖") && !row.productName.includes("人参"));
await page.evaluate((rows) => {
  localStorage.setItem("roiSystemSkus", JSON.stringify(rows));
  localStorage.removeItem("roiSystemDeletedSkuIds");
}, stale);

await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");
const result = await page.evaluate(() => {
  const rows = JSON.parse(localStorage.getItem("roiSystemSkus") || "[]");
  return {
    count: rows.length,
    has88: rows.some((row) => row.productName === "88g咖啡糖"),
    hasGinseng: rows.some((row) => row.productName.includes("人参")),
    metric: document.querySelector("#metricSkuCount")?.textContent,
  };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
