import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");
await page.click('[data-view="costs"]');

const result = await page.evaluate(() => ({
  rows: document.querySelectorAll("#skuTableBody tr").length,
  exportButton: document.querySelector("#exportConfigBtn")?.textContent.trim(),
  importButton: document.querySelector(".file-button")?.textContent.trim(),
  costRows: document.querySelectorAll("#costTableBody tr").length,
}));

await browser.close();
console.log(JSON.stringify(result, null, 2));
