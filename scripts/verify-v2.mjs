import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({ viewport: { width: 1500, height: 950 } });

await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
await page.waitForSelector("#skuTableBody tr");

const overviewSelf = await page.evaluate(() => ({
  rows: document.querySelectorAll("#skuTableBody tr").length,
  metricSkuCount: document.querySelector("#metricSkuCount")?.textContent,
  metricCalculatedCount: document.querySelector("#metricCalculatedCount")?.textContent,
  avgRoi: document.querySelector("#metricAvgRoi")?.textContent,
  hasEdit: !!document.querySelector('[data-action="edit"]'),
  hasDelete: !!document.querySelector('[data-action="delete"]'),
}));

await page.selectOption("#overviewChannel", "influencer");
const overviewInfluencer = await page.evaluate(() => ({
  avgRoi: document.querySelector("#metricAvgRoi")?.textContent,
  firstRoi: document.querySelector("#skuTableBody tr td:nth-child(9)")?.textContent,
}));

await page.click('[data-action="edit"]');
await page.waitForSelector("#skuDialog[open]");
await page.fill("#editRefundRate", "12.5");
await page.click("#saveSkuBtn");
await page.waitForSelector("#skuDialog", { state: "attached" });
const editedRefund = await page.evaluate(() => document.querySelector("#skuTableBody tr td:nth-child(5)")?.textContent);

await page.click('[data-view="costs"]');
const costs = await page.evaluate(() => ({
  header: [...document.querySelectorAll("#costsView th")].map((th) => th.textContent.trim()),
  rows: document.querySelectorAll("#costTableBody tr").length,
  hasProductColumn: [...document.querySelectorAll("#costTableBody tr")].some((row) => row.children[0]?.textContent.trim().length > 0),
}));

await page.click('[data-view="calculator"]');
await page.fill("#calcProduct", "麦卢卡蜂蜜香润糖88g");
await page.fill("#calcSpec", "88g*1+15.6g*4");
await page.click("#parseSpecBtn");
await page.fill("#calcPrice", "88");
await page.selectOption("#calcChannel", "self");
const calcSelf = await page.evaluate(() => ({
  productCost: document.querySelector("#productCostResult")?.textContent,
  roiRefund: document.querySelector("#roiRefundResult")?.textContent,
  influencerRate: document.querySelector("#influencerRate")?.value,
  leaderRate: document.querySelector("#leaderRate")?.value,
}));
await page.selectOption("#calcChannel", "influencer");
const calcInfluencer = await page.evaluate(() => ({
  roiRefund: document.querySelector("#roiRefundResult")?.textContent,
  influencerRate: document.querySelector("#influencerRate")?.value,
  leaderRate: document.querySelector("#leaderRate")?.value,
}));

await page.screenshot({ path: "C:/Users/我是好人/wenan/roi-system/verification-v2.png", fullPage: true });
await browser.close();

console.log(JSON.stringify({ overviewSelf, overviewInfluencer, editedRefund, costs, calcSelf, calcInfluencer }, null, 2));
