import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1300, height: 800 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.evaluate(() => {
  const rows = JSON.parse(localStorage.getItem("roiSystemSkus") || "[]");
  for (const row of rows) {
    if (row.productName === "黑金木糖醇咖啡糖" && row.sku.startsWith("12g")) {
      row.productName = "黑鸡木糖醇咖啡糖";
      row.manual = false;
    }
  }
  localStorage.setItem("roiSystemSkus", JSON.stringify(rows));
});
await page.reload({ waitUntil: "networkidle" });

const result = await page.evaluate(() => {
  const rows = JSON.parse(localStorage.getItem("roiSystemSkus") || "[]");
  return {
    bad: rows.filter((row) => row.productName.includes("黑鸡")).length,
    good: rows.filter((row) => row.productName.includes("黑金木糖醇咖啡糖")).length,
  };
});

await browser.close();
console.log(JSON.stringify(result, null, 2));
