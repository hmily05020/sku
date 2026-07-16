import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const skuSources = [
  "C:/Users/我是好人/Desktop/各部门视频号sku及机制.xlsx",
  "C:/Users/我是好人/Desktop/七部-三部_商品清单.xlsx",
];
const calcPath = "C:/Users/我是好人/Desktop/新媒体3&7部主推商品价格机制测算表-【日常版】更新时间2026.3.12(2).xlsx";
const outPath = "C:/Users/我是好人/wenan/roi-system/src/data.json";

function text(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function number(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, "").replace("%", ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function isPrice(value) {
  return typeof value === "number" || (typeof value === "string" && Number.isFinite(Number(value)));
}

function normalizeDept(sheetName) {
  return sheetName.replace(/咖啡糖\d?$/, "").replace(/益生菌微泡片$/, "").trim() || sheetName;
}

function normalizeProductName(name) {
  return text(name).replace(/黑鸡木糖醇咖啡糖/g, "黑金木糖醇咖啡糖");
}

function colIndex(headers, candidates) {
  const normalized = headers.map((item) => text(item).replace(/\s/g, ""));
  for (const candidate of candidates) {
    const idx = normalized.findIndex((header) => header === candidate || header.includes(candidate));
    if (idx >= 0) return idx;
  }
  return -1;
}

function readSheetsFromSummary(ndjson) {
  return ndjson
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((record) => record.kind === "sheet");
}

async function loadWorkbook(path) {
  const blob = await FileBlob.load(path);
  return SpreadsheetFile.importXlsx(blob);
}

async function extractCurrentSkus(workbook, sourcePath) {
  const summary = await workbook.inspect({ kind: "sheet", include: "name,index", maxChars: 5000 });
  const sheets = readSheetsFromSummary(summary.ndjson);
  const rows = [];

  for (const sheetInfo of sheets) {
    const sheet = workbook.worksheets.getItem(sheetInfo.name);
    const values = sheet.getUsedRange(true).values ?? [];
    if (values.length < 2) continue;

    const headers = values[0];
    let productNameIdx = colIndex(headers, ["商品名称"]);
    if (productNameIdx < 0 && headers.length > 1 && text(headers[1]) === "") productNameIdx = 1;
    const productTitleIdx = colIndex(headers, ["商品标题"]);
    const productIdIdx = colIndex(headers, ["商品ID"]);
    const skuNameIdx = colIndex(headers, ["SKU名称"]);
    let skuIdx = headers.map((header) => text(header).replace(/\s/g, "")).findIndex((header) => header.toUpperCase() === "SKU");
    const priceIdx = colIndex(headers, ["价格"]);
    if (skuIdx < 0 && skuNameIdx >= 0) skuIdx = skuNameIdx + 1;

    let productName = "";
    let productTitle = "";
    let productId = "";
    for (let r = 1; r < values.length; r += 1) {
      const row = values[r] ?? [];
      if (productNameIdx >= 0 && text(row[productNameIdx])) productName = normalizeProductName(row[productNameIdx]);
      if (productTitleIdx >= 0 && text(row[productTitleIdx])) productTitle = text(row[productTitleIdx]);
      if (productIdIdx >= 0 && text(row[productIdIdx])) productId = text(row[productIdIdx]);

      if (priceIdx < 0 || skuIdx < 0 || !isPrice(row[priceIdx])) continue;
      const sku = text(row[skuIdx]) || (skuNameIdx >= 0 ? text(row[skuNameIdx]) : "");
      if (!productName || !sku) continue;

      rows.push({
        id: `${sheetInfo.name}-${r}-${hash(`${sourcePath}|${sheetInfo.name}|${productName}|${sku}|${number(row[priceIdx])}`)}`,
        department: normalizeDept(sheetInfo.name),
        sheet: sheetInfo.name,
        sourcePath,
        productName,
        productTitle,
        productId,
        skuName: skuNameIdx >= 0 ? text(row[skuNameIdx]) : "",
        sku,
        price: number(row[priceIdx]),
      });
    }
  }
  return rows;
}

function dedupeSkus(rows) {
  const unique = new Map();
  for (const row of rows) {
    const key = `${row.department}|${row.productName}|${row.sku}|${row.price}`;
    if (!unique.has(key)) unique.set(key, row);
  }
  return Array.from(unique.values());
}

async function extractCalcRows(workbook) {
  const summary = await workbook.inspect({ kind: "sheet", include: "name,index", maxChars: 5000 });
  const sheets = readSheetsFromSummary(summary.ndjson);
  const rows = [];
  const productCosts = new Map();

  for (const sheetInfo of sheets) {
    const sheet = workbook.worksheets.getItem(sheetInfo.name);
    const used = sheet.getUsedRange(true);
    const values = used.values ?? [];
    const formulas = used.formulas ?? [];
    if (values.length < 3) continue;

    let productName = sheetInfo.name.replace(/（日常版）|\(日常版\)/g, "");
    if (text(values[0]?.[0])) {
      const title = text(values[0][0]).split(/\n/).pop();
      productName = title.replace(/_价格机制测算表/g, "").replace(/价格机制测算表/g, "").trim() || productName;
    }

    let activeChannel = "";
    let activePlatform = "";
    for (let r = 1; r < values.length; r += 1) {
      const row = values[r] ?? [];
      const spec = text(row[2]);
      if (text(row[0]) && text(row[0]) !== "平台") activePlatform = text(row[0]);
      if (text(row[1]) && text(row[1]) !== "渠道") activeChannel = text(row[1]);
      if (!spec || spec === "规格" || !isPrice(row[3])) continue;

      const record = {
        id: `${sheetInfo.name}-${r + 1}`,
        sheet: sheetInfo.name,
        productName,
        platform: activePlatform,
        channel: activeChannel,
        spec,
        price: number(row[3]),
        markup: number(row[4]),
        productCost: number(row[5]),
        giftCost: number(row[6]),
        totalProductCost: number(row[7]),
        shippingCost: number(row[8]),
        platformFee: number(row[9]),
        shareFee: number(row[10]),
        laborFee: number(row[11]),
        freightInsurance: number(row[12]),
        deliveryCost: number(row[13]),
        influencerCommission: number(row[14]),
        leaderCommission: number(row[15]),
        grossProfit: number(row[16]),
        margin: number(row[17]),
        breakEvenRoiNet: number(row[18]),
        breakEvenRoiWithRefund: number(row[19]),
        note: text(row[20]),
        costFormula: text(formulas[r]?.[5]),
        giftFormula: text(formulas[r]?.[6]),
      };
      rows.push(record);

      const costKey = inferComponentKey(spec, productName, false);
      const giftKey = inferComponentKey(spec, productName, true);
      if (costKey) addProductCost(productCosts, costKey, inferUnitCost(record.costFormula, record.productCost, spec, costKey), record);
      if (giftKey) addProductCost(productCosts, giftKey, inferUnitCost(record.giftFormula, record.giftCost, spec, giftKey), record);
    }
  }

  const components = Array.from(productCosts.values()).sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
  return { rows, components };
}

function inferComponentKey(spec, productName, isGift) {
  const normalized = spec.replace(/\s/g, "").replace(/克/g, "g");
  const tokens = [...normalized.matchAll(/(\d+(?:\.\d+)?g|7g|15\.6g|5\.4g|30g|45g|88g|98g|21g|48g|90g)/gi)]
    .map((m) => m[1]);
  if (isGift) {
    const small = tokens.find((token) => /7g|15\.6g|5\.4g|12g|13\.8g|14g|15g/i.test(token)) || tokens[tokens.length - 1];
    return small || null;
  }
  const primary = tokens.find((token) => !/7g|15\.6g|5\.4g/i.test(token)) || tokens[0];
  if (primary) return primary;
  const fallback = productName.match(/(\d+(?:\.\d+)?g)/i)?.[1];
  return fallback || null;
}

function addProductCost(map, name, unitCost, record) {
  if (!Number.isFinite(unitCost) || unitCost <= 0) return;
  const key = `${name}|${unitCost}`;
  if (!map.has(key)) {
    map.set(key, {
      id: key,
      name,
      unitCost,
      sourceProduct: record.productName,
      sourceSheet: record.sheet,
      sourceSpec: record.spec,
    });
  }
}

function inferUnitCost(formula, totalCost, spec, componentName) {
  const quantity = quantityForComponent(spec, componentName);
  if (quantity > 0 && totalCost > 0) return round2(totalCost / quantity);
  const match = text(formula).match(/^=(\d+(?:\.\d+)?)\*(\d+(?:\.\d+)?)$/);
  if (!match) return totalCost;
  const left = Number(match[1]);
  const right = Number(match[2]);
  if (Number.isInteger(left) && !Number.isInteger(right)) return right;
  if (!Number.isInteger(left) && Number.isInteger(right)) return left;
  return Math.min(left, right);
}

function quantityForComponent(spec, componentName) {
  const escaped = componentName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const direct = text(spec).replace(/克/g, "g").match(new RegExp(`${escaped}\\s*\\*\\s*(\\d+(?:\\.\\d+)?)`, "i"));
  if (direct) return Number(direct[1]);
  const reverse = text(spec).replace(/克/g, "g").match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*[盒袋瓶]?\\s*${escaped}`, "i"));
  if (reverse) return Number(reverse[1]);
  return 0;
}

function withAliases(components) {
  const output = [...components];
  const has156 = output.some((item) => item.name === "15.6g");
  const smallGift = output.find((item) => item.name === "15g" && Math.abs(item.unitCost - 0.9) < 0.001);
  if (!has156 && smallGift) {
    output.push({
      ...smallGift,
      id: "15.6g|0.9",
      name: "15.6g",
      sourceSpec: `${smallGift.sourceSpec}（按15g赠品成本映射）`,
    });
  }
  return output.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN") || a.unitCost - b.unitCost);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function hash(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = Math.imul(31, h) + value.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(36);
}

const [skuWorkbooks, calcWorkbook] = await Promise.all([
  Promise.all(skuSources.map(async (path) => ({ path, workbook: await loadWorkbook(path) }))),
  loadWorkbook(calcPath),
]);

const skuGroups = await Promise.all(skuWorkbooks.map(({ path, workbook }) => extractCurrentSkus(workbook, path)));
const currentSkus = dedupeSkus(skuGroups.flat());
const calcData = await extractCalcRows(calcWorkbook);

const output = {
  generatedAt: new Date().toISOString(),
  sources: {
    currentSkuWorkbooks: skuSources,
    calcWorkbook: calcPath,
  },
  defaults: {
    platformRate: 0.02,
    shareRate: 0.054,
    laborRate: 0.049,
    influencerRate: 0.03,
    leaderRate: 0.02,
    refundRate: 0.1,
    shippingCost: 2.5,
    freightInsurance: 0.2,
  },
  currentSkus,
  calcRows: calcData.rows,
  components: withAliases(calcData.components),
};

await fs.writeFile(outPath, JSON.stringify(output, null, 2), "utf8");
console.log(JSON.stringify({
  outPath,
  currentSkus: currentSkus.length,
  departments: [...new Set(currentSkus.map((row) => row.department))],
  calcRows: calcData.rows.length,
  components: calcData.components.length,
}, null, 2));
