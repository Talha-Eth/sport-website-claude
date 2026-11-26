/* ============================================================
   screenshot.js - capture pages with headless Chrome over CDP.
   Usage:
     node tools/screenshot.js "url|out.png|width|height|full"
   or several entries separated by spaces.
   It also prints JavaScript errors and console errors found on
   each page, which makes it a quick smoke test.
   ============================================================ */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9000 + (process.pid % 900);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "matchday-cdp-"));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-default-apps",
  "--disable-sync",
  "--no-service-autorun",
  "--password-store=basic",
  "--disable-dev-shm-usage",
  "--allow-file-access-from-files",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "about:blank",
], { stdio: "ignore" });

function cleanup() {
  try {
    spawn("taskkill", ["/pid", String(chrome.pid), "/T", "/F"], { stdio: "ignore" });
  } catch (e) { /* ignore */ }
}

async function waitForChrome() {
  for (let i = 0; i < 100; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const targets = await response.json();
      const page = targets.find((t) => t.type === "page");
      if (page) return page;
    } catch (e) { /* not ready yet */ }
    await sleep(150);
  }
  throw new Error("Chrome did not start");
}

async function main() {
  const started = Date.now();
  const page = await waitForChrome();
  console.log(`chrome ready in ${Date.now() - started}ms`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 1;
  const pending = new Map();
  const pageErrors = [];
  const consoleErrors = [];

  ws.addEventListener("message", (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch (e) { return; }
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(JSON.stringify(message.error)));
      else resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      const details = message.params.exceptionDetails;
      pageErrors.push(details.exception ? details.exception.description : details.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      consoleErrors.push(message.params.args.map((arg) => arg.value || arg.description || "").join(" "));
    }
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") {
      consoleErrors.push(`${message.params.entry.source}: ${message.params.entry.text}`);
    }
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");

  const entries = process.argv.slice(2);
  if (!entries.length) throw new Error("No screenshot entries provided");

  for (const entry of entries) {
    const [url, out, widthArg, heightArg, modeArg, action] = entry.split("|");
    const width = Number(widthArg) || 1440;
    const height = Number(heightArg) || 900;
    const rawMode = modeArg || "full";
    const theme = rawMode.endsWith(":dark") ? "dark" : "light";
    const mode = theme === "dark" ? rawMode.slice(0, -5) : rawMode;
    const mobile = width <= 820;
    pageErrors.length = 0;
    consoleErrors.length = 0;

    await send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile,
      screenWidth: width, screenHeight: height,
    });
    await send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: theme }],
    });
    await send("Page.navigate", { url });
    for (let i = 0; i < 80; i++) {
      const state = await send("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && !!window.Matchday && !!window.Store",
        returnByValue: true,
      });
      if (state.result.value) break;
      await sleep(100);
    }
    await sleep(900); // fonts, first paint and animations
    if (action) {
      if (action.startsWith("click:")) {
        await send("Runtime.evaluate", {
          expression: `document.querySelector(${JSON.stringify(action.slice(6))})?.click()`,
        });
      } else if (action.startsWith("eval:")) {
        await send("Runtime.evaluate", { expression: action.slice(5) });
      }
      await sleep(500);
    }
    if (process.env.MD_DEBUG) {
      const debug = await send("Runtime.evaluate", {
        expression: `JSON.stringify({ w: innerWidth, mq: matchMedia("(max-width: 560px)").matches, mq960: matchMedia("(max-width: 960px)").matches, rects: [...document.querySelectorAll(".sb-actions > *")].map(e => ({ t: e.textContent.trim(), r: e.getBoundingClientRect().toJSON(), f: getComputedStyle(e).flex })) })`,
        returnByValue: true,
      });
      console.log("DEBUG", debug.result.value);
    }

    const metrics = await send("Page.getLayoutMetrics");
    const content = metrics.cssContentSize || metrics.contentSize;
    let clip;
    let tallViewport = height;
    if (mode === "full") {
      tallViewport = Math.min(16000, Math.max(height, content.height));
    } else if (mode.startsWith("clip:")) {
      const [, yArg, hArg] = mode.split(":");
      const y = Number(yArg) || 0;
      const h = Number(hArg) || 900;
      clip = { x: 0, y, width: content.width, height: Math.min(16000, h), scale: 1 };
      tallViewport = Math.min(16000, Math.max(height, y + h));
    }
    if (mode !== "viewport") {
      // Render into a tall viewport instead of using captureBeyondViewport:
      // that avoids a Chrome headless compositing glitch on some flex rows.
      await send("Emulation.setDeviceMetricsOverride", {
        width, height: Math.round(tallViewport), deviceScaleFactor: 1, mobile,
        screenWidth: width, screenHeight: Math.round(tallViewport),
      });
      await sleep(350);
    }
    const shot = await send("Page.captureScreenshot", {
      format: "png",
      ...(clip ? { clip } : {}),
    });
    const absolute = path.resolve(out);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, Buffer.from(shot.data, "base64"));
    const errors = [...pageErrors, ...consoleErrors];
    console.log(`OK ${path.basename(absolute)} ${content.width}x${content.height}${errors.length ? `  ERRORS: ${JSON.stringify(errors)}` : ""}`);
  }

  ws.close();
  cleanup();
  process.exit(0);
}

main().catch((error) => {
  console.error("SCREENSHOT FAILED", error);
  cleanup();
  process.exit(1);
});
