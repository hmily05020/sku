import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const path = "C:/Users/我是好人/Desktop/七部-三部_商品清单.xlsx";
const blob = await FileBlob.load(path);
const workbook = await SpreadsheetFile.importXlsx(blob);

const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 30000,
  tableMaxRows: 30,
  tableMaxCols: 18,
  tableMaxCellChars: 120,
});

console.log(summary.ndjson);
