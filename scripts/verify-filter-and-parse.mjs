import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");

await page.selectOption("#departmentFilter", "七部");
const filterState = await page.evaluate(() => ({
  department: document.querySelector("#departmentFilter")?.value,
  productOptions: [...document.querySelectorAll("#productFilter option")].map((option) => option.value),
  rowDepartments: [...document.querySelectorAll("#skuTableBody tr td:first-child")].slice(0, 10).map((td) => td.textContent.trim()),
}));

const targetProduct = filterState.productOptions.find((item) => item !== "全部");
await page.selectOption("#productFilter", targetProduct);
const productFiltered = await page.evaluate(() => ({
  product: document.querySelector("#productFilter")?.value,
  rows: document.querySelectorAll("#skuTableBody tr").length,
  rowProducts: [...document.querySelectorAll("#skuTableBody tr td:nth-child(2)")].slice(0, 10).map((td) => td.textContent.trim()),
}));

await page.click("#addSkuBtn");
await page.waitForSelector("#skuDialog[open]");
const dialogState = await page.evaluate(() => ({
  departmentTag: document.querySelector("#editDepartment")?.tagName,
  departmentOptions: [...document.querySelectorAll("#editDepartment option")].map((option) => option.value),
}));
await page.click("#cancelSkuEditBtn");

await page.click('[data-view="calculator"]');
await page.fill("#calcProduct", "通用");
await page.fill("#calcSpec", "15g*1+7g*1");
await page.click("#parseSpecBtn");
const parsed = await page.evaluate(() => [...document.querySelectorAll(".component-row")].map((row) => ({
  name: row.querySelector('[data-field="name"]')?.value,
  quantity: row.querySelector('[data-field="quantity"]')?.value,
  unitCost: row.querySelector('[data-field="unitCost"]')?.value,
})));

await browser.close();
console.log(JSON.stringify({ filterState, productFiltered, dialogState, parsed }, null, 2));
