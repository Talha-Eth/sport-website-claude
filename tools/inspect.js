/* Evaluate expressions in a page over CDP - a small QA helper.
   Usage: node tools/inspect.js "<url>" "<js expression>"
   Prints the JSON result and any page errors. */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9000 + (process.pid % 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "matchday-inspect-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const chrome = spawn(CHROME, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
  "--no-default-browser-check", "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

function cleanup() {
  try { spawn("taskkill", ["/pid", String(chrome.pid), "/T", "/F"], { stdio: "ignore" }); } catch (e) {}
}

async function main() {
  let page;
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === "page");
      if (page) break;
    } catch (e) {}
    await sleep(150);
  }
  if (!page) throw new Error("Chrome did not start");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let nextId = 1;
  const pending = new Map();
  const errors = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map((arg) => arg.description || arg.value).join(" "));
    }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send("Page.enable");
  await send("Runtime.enable");
  const url = process.argv[2];
  const expression = process.argv[3] || "document.title";
  await send("Emulation.setDeviceMetricsOverride", {
    width: Number(process.argv[4]) || 1440,
    height: Number(process.argv[5]) || 1000,
    deviceScaleFactor: 1, mobile: (Number(process.argv[4]) || 1440) <= 820,
  });
  await send("Page.navigate", { url });
  await sleep(3200);
  const result = await send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  console.log(JSON.stringify(result.result.value, null, 2));
  if (result.exceptionDetails) console.log("EXCEPTION", JSON.stringify(result.exceptionDetails));
  if (errors.length) console.log("PAGE ERRORS", errors);
  ws.close();
  cleanup();
  process.exit(0);
}

main().catch((error) => { console.error(error); cleanup(); process.exit(1); });
