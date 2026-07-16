import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = [
  {
    label: "sku",
    path: "C:/Users/我是好人/Desktop/各部门视频号sku及机制.xlsx",
  },
  {
    label: "calc",
    path: "C:/Users/我是好人/Desktop/新媒体3&7部主推商品价格机制测算表-【日常版】更新时间2026.3.12(2).xlsx",
  },
];

for (const file of files) {
  const blob = await FileBlob.load(file.path);
  const workbook = await SpreadsheetFile.importXlsx(blob);
  const summary = await workbook.inspect({
    kind: "workbook,sheet,table",
    maxChars: 20000,
    tableMaxRows: 20,
    tableMaxCols: 18,
    tableMaxCellChars: 120,
  });
  console.log(`\n===== ${file.label} =====`);
  console.log(summary.ndjson);

  const sheets = summary.ndjson
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((record) => record.kind === "sheet");

  for (const sheetInfo of sheets) {
    const formulas = await workbook.inspect({
      kind: "formula",
      sheetId: sheetInfo.name,
      range: "A1:Z80",
      maxChars: 6000,
      options: { maxResults: 80 },
    });
    console.log(`\n--- formulas ${file.label}/${sheetInfo.name} ---`);
    console.log(formulas.ndjson);
  }
}
