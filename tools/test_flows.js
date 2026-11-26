/* ============================================================
   test_flows.js - headless interaction tests for the site.
   Runs each scenario in Chrome over CDP and checks DOM state.
   ============================================================ */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9300 + (process.pid % 500);
const { pathToFileURL } = require("url");
const BASE = pathToFileURL(path.resolve(__dirname, "..") + path.sep).href;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "matchday-tests-"));
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

const tests = [
  {
    name: "Home: set and remove a reminder, bell count and toast",
    url: "index.html",
    script: `(async () => {
      localStorage.removeItem("matchday.reminders");
      Matchday.updateBell && Matchday.updateBell();
      const button = document.querySelector("[data-remind]");
      if (!button) return { pass: false, detail: "no reminder button" };
      button.click();
      await new Promise((r) => setTimeout(r, 120));
      const count = Matchday.getReminders().length;
      const bell = document.getElementById("bell-count").textContent;
      const toast = document.querySelector(".toast");
      button.click();
      await new Promise((r) => setTimeout(r, 120));
      const afterRemove = Matchday.getReminders().length;
      return { pass: count === 1 && Number(bell) === 1 && !!toast && afterRemove === 0,
        detail: { count, bell, toast: !!toast, afterRemove } };
    })()`,
  },
  {
    name: "Home: league filter narrows the match list",
    url: "index.html",
    script: `(async () => {
      const select = document.getElementById("f-league");
      select.value = "87";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      const badges = [...document.querySelectorAll(".match-card .match-league")].map((el) => el.textContent.trim());
      const anyWrong = badges.some((name) => name && !name.toLowerCase().includes("laliga"));
      return { pass: badges.length > 0 && !anyWrong, detail: { cards: badges.length, anyWrong } };
    })()`,
  },
  {
    name: "Global search: results open for a player query",
    url: "index.html",
    script: `(async () => {
      const input = document.getElementById("site-search");
      input.value = "arsenal";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 180));
      const results = [...document.querySelectorAll("#search-results .search-result")];
      return { pass: results.length > 0 && results.some((el) => el.textContent.includes("Arsenal")),
        detail: { results: results.length, text: results.slice(0, 3).map((el) => el.textContent.trim().replace(/\\s+/g, " ")) } };
    })()`,
  },
  {
    name: "Match: tabs switch to player statistics",
    url: "match/index.html?id=pl-r13-1",
    script: `(async () => {
      const before = document.querySelectorAll("#match-panels .data-table").length;
      document.querySelector('[data-tab="player-stats"]').click();
      await new Promise((r) => setTimeout(r, 120));
      const visible = !document.querySelector('[data-panel="player-stats"]').hidden;
      const rows = document.querySelectorAll('[data-panel="player-stats"] tbody tr').length;
      return { pass: visible && rows >= 22, detail: { before, visible, rows } };
    })()`,
  },
  {
    name: "Match: upcoming fixture exposes reminder and calendar",
    url: "match/index.html?id=pl-r13-2",
    script: `(async () => {
      const remind = document.querySelector("[data-remind]");
      const calendar = document.querySelector('a[download^="matchday-"]');
      const countdown = document.querySelector("[data-countdown]");
      return { pass: !!remind && !!calendar && !!countdown,
        detail: { remind: !!remind, calendar: !!calendar, countdown: countdown && countdown.textContent } };
    })()`,
  },
  {
    name: "Leagues: standings tab and league switching",
    url: "leagues/index.html?league=47",
    script: `(async () => {
      document.querySelector('[data-tab="standings"]').click();
      await new Promise((r) => setTimeout(r, 100));
      const rows = document.querySelectorAll('.standings-table tbody tr').length;
      const link = document.querySelector('[data-league="87"]');
      link.click();
      await new Promise((r) => setTimeout(r, 150));
      const hero = document.querySelector(".league-hero h1").textContent.trim();
      return { pass: rows === 8 && hero === "LaLiga", detail: { rows, hero } };
    })()`,
  },
  {
    name: "Team: squad tab shows 14 players",
    url: "team/index.html?id=arsenal",
    script: `(async () => {
      document.querySelector('[data-tab="squad"]').click();
      await new Promise((r) => setTimeout(r, 100));
      const players = document.querySelectorAll(".squad-table tbody tr:not(.group-row)").length;
      const groups = document.querySelectorAll(".squad-table .group-row").length;
      return { pass: players === 14 && groups === 4, detail: { players, groups } };
    })()`,
  },
  {
    name: "Players: sort, paginate and select two to compare",
    url: "players/index.html",
    script: `(async () => {
      const firstPageRows = document.querySelectorAll("[data-player-row]").length;
      document.querySelector('[data-sort="name"]').click();
      await new Promise((r) => setTimeout(r, 100));
      const sortHeader = document.querySelector('[data-sort="name"]').closest("th").getAttribute("aria-sort");
      document.querySelector('[data-goto="2"]').click();
      await new Promise((r) => setTimeout(r, 100));
      const count = document.getElementById("players-count").textContent;
      const boxes = [...document.querySelectorAll(".player-select")];
      boxes[0].click();
      boxes[1].click();
      await new Promise((r) => setTimeout(r, 100));
      const bar = document.getElementById("compare-bar");
      const go = document.getElementById("compare-go");
      const chips = bar.querySelectorAll(".selected-chip").length;
      return { pass: firstPageRows === 12 && sortHeader === "ascending" && count.includes("13–24")
        && !bar.hidden && !go.disabled && chips === 2,
        detail: { firstPageRows, sortHeader, count, chips, goDisabled: go.disabled } };
    })()`,
  },
  {
    name: "Players: league filter changes team options and count",
    url: "players/index.html",
    script: `(async () => {
      const select = document.getElementById("player-league");
      select.value = "87";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 150));
      const teams = document.querySelectorAll("#player-team option").length;
      const count = document.getElementById("players-count").textContent;
      return { pass: teams === 9 && count.startsWith("112"), detail: { teams, count } };
    })()`,
  },
  {
    name: "Player profile: season stats and compare picker",
    url: "player/index.html?id=arsenal-p7",
    script: `(async () => {
      const cards = document.querySelectorAll(".season-grid .stat-card").length;
      const rows = document.querySelectorAll(".profile-table tbody tr").length;
      const select = document.getElementById("compare-choose");
      select.value = select.options[1].value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      const enabled = !document.getElementById("compare-pick-go").disabled;
      return { pass: cards === 5 && rows > 0 && enabled, detail: { cards, rows, enabled } };
    })()`,
  },
  {
    name: "Compare: bars, values and swap",
    url: "compare/index.html?a=arsenal-p7&b=liverpool-p9",
    script: `(async () => {
      const rows = document.querySelectorAll(".compare-row").length;
      const names = [...document.querySelectorAll(".compare-player h3")].map((el) => el.textContent.trim());
      const fills = document.querySelectorAll(".compare-fill").length;
      document.getElementById("compare-swap").click();
      await new Promise((r) => setTimeout(r, 100));
      const swapped = [...document.querySelectorAll(".compare-player h3")].map((el) => el.textContent.trim());
      return { pass: rows === 6 && fills === 12 && names[0] !== swapped[0],
        detail: { rows, fills, names, swapped } };
    })()`,
  },
  {
    name: "Reminders: add, change delivery, save settings and remove",
    url: "reminders/index.html",
    script: `(async () => {
      localStorage.removeItem("matchday.reminders");
      localStorage.removeItem("matchday.settings");
      Matchday.addReminder(Store.match("pl-r13-2"));
      Matchday.addReminder(Store.match("laliga-r13-3"));
      await new Promise((r) => setTimeout(r, 150));
      const cards = document.querySelectorAll(".reminder-card").length;
      const select = document.querySelector("[data-delivery]");
      select.value = "website";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      await new Promise((r) => setTimeout(r, 120));
      const delivery = Matchday.getReminders().find((r) => r.id === select.dataset.delivery).delivery;
      const email = document.getElementById("settings-email");
      email.value = "not-an-email";
      document.getElementById("settings-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
      const invalidShown = !document.getElementById("email-error").hidden;
      email.value = "fan@example.com";
      document.getElementById("settings-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 100));
      const saved = Matchday.getSettings().email === "fan@example.com";
      document.querySelector("[data-remove]").click();
      await new Promise((r) => setTimeout(r, 120));
      const after = Matchday.getReminders().length;
      return { pass: cards === 2 && delivery === "website" && invalidShown && saved && after === 1,
        detail: { cards, delivery, invalidShown, saved, after } };
    })()`,
  },
  {
    name: "About: contact form validation and success state",
    url: "about/index.html",
    script: `(async () => {
      localStorage.removeItem("matchday.messages");
      const name = document.getElementById("contact-name");
      const email = document.getElementById("contact-email");
      const message = document.getElementById("contact-message");
      name.value = "";
      email.value = "bad";
      message.value = "short";
      document.getElementById("contact-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 80));
      const errors = document.querySelectorAll('#contact-form .form-error:not([hidden])').length;
      name.value = "Talha";
      email.value = "talha@example.com";
      message.value = "This is a valid test message for the contact form.";
      document.getElementById("contact-form").dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 120));
      const success = !document.getElementById("contact-success").hidden;
      const stored = JSON.parse(localStorage.getItem("matchday.messages") || "[]").length;
      return { pass: errors === 3 && success && stored === 1, detail: { errors, success, stored } };
    })()`,
  },
  {
    name: "Theme toggle persists dark mode",
    url: "index.html",
    script: `(async () => {
      localStorage.removeItem("theme");
      document.documentElement.setAttribute("data-theme", "light");
      document.getElementById("theme-toggle").click();
      await new Promise((r) => setTimeout(r, 80));
      const dark = document.documentElement.getAttribute("data-theme") === "dark";
      const saved = localStorage.getItem("theme");
      return { pass: dark && saved === "dark", detail: { dark, saved } };
    })()`,
  },
  {
    name: "Mobile: menu and search open",
    url: "index.html",
    width: 390,
    height: 844,
    script: `(async () => {
      document.getElementById("menu-toggle").click();
      await new Promise((r) => setTimeout(r, 80));
      const navOpen = document.body.classList.contains("nav-open");
      document.getElementById("menu-toggle").click();
      document.getElementById("search-open").click();
      await new Promise((r) => setTimeout(r, 80));
      const searchOpen = document.body.classList.contains("search-open");
      return { pass: navOpen && searchOpen, detail: { navOpen, searchOpen } };
    })()`,
  },
];

async function main() {
  let page;
  for (let i = 0; i < 400; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      page = list.find((t) => t.type === "page");
      if (page) break;
    } catch (e) { /* wait */ }
    await sleep(150);
  }
  if (!page) throw new Error("Chrome did not start");

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener("open", resolve, { once: true }));
  let nextId = 1;
  const pending = new Map();
  let pageErrors = [];

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
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 20000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send("Page.enable");
  await send("Runtime.enable");

  let failures = 0;
  const only = (process.env.MD_TESTS || "").split(",").filter(Boolean).map(Number);
  const selected = tests.filter((test, index) => !only.length || only.includes(index));

  for (const test of selected) {
    console.log(`RUN   ${test.name}`);
    pageErrors = [];
    const width = test.width || 1440;
    const height = test.height || 1000;
    await send("Emulation.setDeviceMetricsOverride", {
      width, height, deviceScaleFactor: 1, mobile: width <= 820,
      screenWidth: width, screenHeight: height,
    });
    await send("Page.navigate", { url: BASE + test.url });
    for (let i = 0; i < 100; i++) {
      const ready = await send("Runtime.evaluate", {
        expression: "document.readyState === 'complete' && !!window.Matchday && !!window.Store",
        returnByValue: true,
      });
      if (ready.result.value) break;
      await sleep(100);
    }
    await sleep(400);
    let result;
    try {
      const response = await send("Runtime.evaluate", {
        expression: test.script, returnByValue: true, awaitPromise: true,
      });
      result = response.result.value;
      if (response.exceptionDetails) {
        result = { pass: false, detail: response.exceptionDetails.exception?.description || "exception" };
      }
    } catch (error) {
      result = { pass: false, detail: error.message };
    }
    const ok = result && result.pass && pageErrors.length === 0;
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${test.name}`);
    if (!ok) {
      console.log("      ", JSON.stringify(result));
      if (pageErrors.length) console.log("       errors:", pageErrors.slice(0, 3));
    }
  }

  console.log(failures === 0 ? `\nALL ${selected.length} FLOW TESTS PASSED` : `\n${failures} FLOW TESTS FAILED`);
  ws.close();
  cleanup();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("TEST RUN FAILED", error);
  cleanup();
  process.exit(1);
});
