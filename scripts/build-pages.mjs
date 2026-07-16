import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const docsDir = path.join(root, "docs");

await fs.rm(docsDir, { recursive: true, force: true });
await fs.mkdir(path.join(docsDir, "public"), { recursive: true });
await fs.mkdir(path.join(docsDir, "src"), { recursive: true });

let html = await fs.readFile(path.join(root, "public", "index.html"), "utf8");
html = html
  .replace('href="/public/styles.css"', 'href="./public/styles.css"')
  .replace('src="/public/app.js"', 'src="./public/app.js"');

let app = await fs.readFile(path.join(root, "public", "app.js"), "utf8");
app = app.replace('fetch("/src/data.json")', 'fetch("./src/data.json")');

await fs.writeFile(path.join(docsDir, "index.html"), html, "utf8");
await fs.writeFile(path.join(docsDir, "public", "app.js"), app, "utf8");
await fs.copyFile(path.join(root, "public", "styles.css"), path.join(docsDir, "public", "styles.css"));
await fs.copyFile(path.join(root, "src", "data.json"), path.join(docsDir, "src", "data.json"));

console.log(`Built GitHub Pages files in ${docsDir}`);
