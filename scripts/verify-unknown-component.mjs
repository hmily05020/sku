import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.click('[data-view="calculator"]');
const value = await page.evaluate(() => {
  const options = [...document.querySelectorAll("#scenarioSelect option")];
  return options.find((option) => option.textContent.includes("现售 | 二部 | 98g咖啡糖 | 98g*1 | 49.9"))?.value;
});
await page.selectOption("#scenarioSelect", value);

const result = await page.evaluate(() => ({
  spec: document.querySelector("#calcSpec")?.value,
  component: document.querySelector('.component-row [data-field="name"]')?.value,
  shown: document.querySelector('.component-row [data-field="name"] option:checked')?.textContent,
  unitCost: document.querySelector('.component-row [data-field="unitCost"]')?.value,
}));

await browser.close();
console.log(JSON.stringify(result, null, 2));
