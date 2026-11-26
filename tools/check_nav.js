/* ============================================================
   check_nav.js - verify every *runtime-generated* link on the
   site. Loads each page in headless Chrome, collects all
   `<a href>`, and checks that:
     - no href is undefined/null/"function ..." (i.e. a broken
       template value), and
     - every same-site href resolves to a real file on disk.

   This catches the class of bug where a URL helper or nav entry
   was mis-referenced and produced href="undefined".
   ============================================================ */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const BASE = pathToFileURL(ROOT + path.sep).href;
const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 8700 + (process.pid % 700);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "matchday-nav-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", "--disable-extensions", "--disable-background-networking",
  "--allow-file-access-from-files", `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

function cleanup() {
  try { spawn("taskkill", ["/pid", String(chrome.pid), "/T", "/F"], { stdio: "ignore" }); } catch (e) { /* ignore */ }
}

const PAGES = [
  "index.html",
  "match/index.html?id=pl-r13-1",
  "match/index.html?id=pl-r13-2",
  "leagues/index.html?league=47",
  "team/index.html?id=arsenal",
  "players/index.html?team=arsenal&sort=goals",
  "player/index.html?id=arsenal-p7",
  "compare/index.html?a=arsenal-p7&b=liverpool-p9",
  "reminders/index.html",
  "about/index.html",
];

async function main() {
  let page;
  for (let i = 0; i < 300; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((target) => target.type === "page");
      if (page) break;
    } catch (e) { /* wait */ }
    await sleep(150);
  }
  if (!page) throw new Error("Chrome did not start");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let nextId = 1;
  const pending = new Map();
  const pageErrors = [];

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      pageErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      pageErrors.push(message.params.args.map((arg) => arg.description || arg.value).join(" "));
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`timeout ${method}`)); }, 20000);
    pending.set(id, {
      resolve: (value) => { clearTimeout(timer); resolve(value); },
      reject,
    });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");

  let failures = 0;

  for (const relative of PAGES) {
    pageErrors.length = 0;
    await send("Page.navigate", { url: BASE + relative });
    for (let i = 0; i < 100; i++) {
      const ready = await send("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && !!window.Matchday && !!window.Store",
        returnByValue: true,
      });
      if (ready.result.value) break;
      await sleep(100);
    }
    await sleep(300);

    const result = await send("Runtime.evaluate", {
      expression: `JSON.stringify([...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')))`,
      returnByValue: true,
    });
    const hrefs = JSON.parse(result.result.value || "[]");

    const pageFile = relative.split("?")[0].split("#")[0];
    const pageDir = path.dirname(path.join(ROOT, pageFile));

    const bad = [];
    const missing = [];
    const seen = new Set();
    for (const href of hrefs) {
      if (!href || href.startsWith("#") || href.startsWith("data:") || href.startsWith("mailto:")
        || href.startsWith("javascript:") || /^https?:/.test(href)) continue;
      const clean = href.split("?")[0].split("#")[0];
      const key = `${pageFile}|${clean}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (/^(undefined|null)$/.test(clean) || clean.includes("function") || clean.includes("${")) {
        bad.push(href);
        continue;
      }
      const resolved = path.resolve(pageDir, clean);
      if (!fs.existsSync(resolved)) missing.push({ href, resolved: path.relative(ROOT, resolved) });
    }

    const errors = [...bad, ...missing.map((m) => m.href)];
    if (bad.length || missing.length || pageErrors.length) failures += 1;
    console.log(`${bad.length || missing.length || pageErrors.length ? "FAIL" : "PASS"}  ${relative}`
      + (errors.length ? `  ${JSON.stringify(errors)}` : "")
      + (pageErrors.length ? `  console: ${JSON.stringify(pageErrors.slice(0, 3))}` : ""));
  }

  console.log(failures === 0 ? `\nALL ${PAGES.length} PAGES HAVE VALID LINKS` : `\n${failures} PAGES HAVE PROBLEMS`);
  ws.close();
  cleanup();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => { console.error("CHECK NAV FAILED", error); cleanup(); process.exit(1); });
