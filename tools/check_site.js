/* Static checks for the nine-page site: links, assets, scripts,
   template leftovers and duplicate ids. Run with Node. */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const pages = [];
let failures = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "tools", "data"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) pages.push(full);
  }
}
walk(root);

function check(label, condition, detail = "") {
  if (!condition) {
    failures++;
    console.log("FAIL", label, detail);
  }
}

const ALLOWED_EXTERNAL = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

for (const page of pages) {
  const rel = path.relative(root, page).replace(/\\/g, "/");
  const html = fs.readFileSync(page, "utf8");
  check(`${rel}: no template leftovers`, !html.includes("${"), html.match(/\$\{[^}]*\}/)?.[0]);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  check(`${rel}: no duplicate ids`, duplicates.length === 0, duplicates.join(", "));

  const attrs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const attr of attrs) {
    if (!attr || attr.startsWith("#") || attr.startsWith("data:") || attr.startsWith("mailto:")
      || attr.startsWith("javascript:")) continue;
    if (ALLOWED_EXTERNAL.some((prefix) => attr.startsWith(prefix))) continue;
    if (/^https?:/.test(attr)) continue;
    const targetPath = attr.split("?")[0].split("#")[0];
    const resolved = path.resolve(path.dirname(page), targetPath);
    check(`${rel}: link exists -> ${attr}`, fs.existsSync(resolved), resolved);
  }

  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((match) => match[1]);
  check(`${rel}: loads local fonts`, html.includes("assets/css/fonts.css"));
  check(`${rel}: no external font css`, !html.includes("fonts.googleapis.com"));
  check(`${rel}: loads data`, scripts.some((src) => src.includes("matches-data.js")));
  check(`${rel}: loads store`, scripts.some((src) => src.includes("store.js")));
  check(`${rel}: loads common`, scripts.some((src) => src.includes("common.js")));
  check(`${rel}: has header`, html.includes('id="site-header"'));
  check(`${rel}: has footer`, html.includes('id="site-footer"'));
  check(`${rel}: has main`, html.includes('id="main"'));
  check(`${rel}: has page script`, scripts.length >= 4, scripts.join(", "));
}

const jsFiles = [];
function collectJs(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJs(full);
    else if (entry.name.endsWith(".js")) jsFiles.push(full);
  }
}
collectJs(root);

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  check(`${path.relative(root, file)}: syntax`, result.status === 0, (result.stderr || "").split("\n")[0]);
}

const fontCss = fs.readFileSync(path.join(root, "assets/css/fonts.css"), "utf8");
const fontFiles = [...fontCss.matchAll(/url\('\.\.\/fonts\/([^']+)'\)/g)].map((match) => match[1]);
check("fonts.css has @font-face rules", fontCss.includes("@font-face"));
for (const file of fontFiles) {
  check(`font file exists: ${file}`, fs.existsSync(path.join(root, "assets/fonts", file)));
}

const pageNames = pages.map((page) => path.relative(root, page).replace(/\\/g, "/"));
const expected = [
  "index.html", "match/index.html", "leagues/index.html", "team/index.html",
  "players/index.html", "player/index.html", "compare/index.html",
  "reminders/index.html", "about/index.html",
];
check("all nine pages present", expected.every((name) => pageNames.includes(name)), pageNames.join(", "));
check("exactly nine pages", pages.length === 9, pages.length);

console.log(`\n${pages.length} pages, ${jsFiles.length} scripts checked`);
console.log(failures === 0 ? "ALL SITE CHECKS PASSED" : `${failures} SITE CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
