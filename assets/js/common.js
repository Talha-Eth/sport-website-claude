/* ============================================================
   common.js - SHARED by all pages.
   ============================================================ */
const Matchday = (() => {
  const ROOT = document.body.dataset.root || "./";
  const KEY = "matchday.reminders";

  /* ----- Reminders ----- */
  function getReminders() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }
  function saveReminders(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    updateBell();
  }
  function hasReminder(matchId) {
    return getReminders().some((r) => r.id === matchId);
  }
  function toggleReminder(match) {
    const list = getReminders();
    const i = list.findIndex((r) => r.id === match.id);
    if (i >= 0) list.splice(i, 1);
    else list.push({ id: match.id, kickoff: match.kickoff, home: match.home.name, away: match.away.name, league: match.league });
    saveReminders(list);
    return i < 0;
  }

  /* ----- Helpers ----- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });

  /* ----- Header and footer ----- */
  const NAV = [["Matches", "index.html"], ["Leagues", "leagues/"], ["Players", "players/"], ["Reminders", "reminders/"]];

  function drawChrome() {
    const active = document.body.dataset.page;
    const header = document.getElementById("site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="header-inner">
          <a class="logo" href="${ROOT}index.html">Matchday</a>
          <nav class="nav">${NAV.map(([name, path]) =>
            `<a href="${ROOT}${path}" class="${name === active ? "active" : ""}">${name}</a>`).join("")}</nav>
          <div class="header-controls">
            <input class="search" id="site-search" type="search" placeholder="Search teams or players" aria-label="Search">
            <button class="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode">🌙</button>
            <a class="bell" href="${ROOT}reminders/" aria-label="My reminders">&#128276;<span class="bell-count" id="bell-count" hidden>0</span></a>
          </div>
        </div>`;
      
      document.getElementById("site-search").addEventListener("input", (e) =>
        document.dispatchEvent(new CustomEvent("matchday:search", { detail: e.target.value.trim().toLowerCase() })));
      
      setupThemeToggle();
    }
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `<a href="${ROOT}about/">About &amp; Contact</a> &nbsp;|&nbsp; Matchday - football scores and stats`;
    }
    updateBell();
  }

  function setupThemeToggle() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    
    // Set initial icon
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.textContent = isDark ? "☀️" : "🌙";

    btn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const newTheme = currentTheme === "dark" ? "light" : "dark";
      
      document.documentElement.setAttribute("data-theme", newTheme);
      localStorage.setItem("theme", newTheme);
      btn.textContent = newTheme === "dark" ? "☀️" : "🌙";
    });
  }

  function updateBell() {
    const el = document.getElementById("bell-count");
    if (!el) return;
    const n = getReminders().length;
    el.textContent = n;
    el.hidden = n === 0;
  }

  document.addEventListener("DOMContentLoaded", drawChrome);
  return { getReminders, hasReminder, toggleReminder, esc, fmtTime, fmtDate };
})();