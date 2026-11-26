/* ============================================================
   common.js - shared by all nine pages.
   Draws the header and footer, handles the theme switch, the
   global search, reminders (localStorage), toasts and the
   simulated live-score ticker.
   ============================================================ */
const Matchday = (() => {
  const ROOT = document.body.dataset.root || "./";
  const REM_KEY = "matchday.reminders";
  const SETTINGS_KEY = "matchday.settings";
  const DEFAULT_SETTINGS = { email: "", leadMinutes: 60 };
  const notified = new Set();

  const esc = (value) => String(value === undefined || value === null ? "" : value)
    .replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));

  const pad = (n) => String(n).padStart(2, "0");

  /* ---------- formatting ---------- */
  const fmtTime = (value) => new Date(value).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit",
  });

  const fmtDate = (value) => new Date(value).toLocaleDateString([], {
    weekday: "short", day: "numeric", month: "short",
  });

  const fmtDateLong = (value) => new Date(value).toLocaleDateString([], {
    weekday: "long", day: "numeric", month: "long",
  });

  const fmtDateTime = (value) => `${fmtDate(value)} · ${fmtTime(value)}`;

  const startOfDay = (value) => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  function dayLabel(value) {
    const target = startOfDay(value);
    const today = startOfDay(new Date());
    const diff = Math.round((target - today) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    return fmtDate(value);
  }

  function kickoffLabel(value) {
    const target = startOfDay(value);
    const today = startOfDay(new Date());
    const diff = Math.round((target - today) / 86400000);
    if (diff === 0) return `Today ${fmtTime(value)}`;
    if (diff === 1) return `Tomorrow ${fmtTime(value)}`;
    return `${fmtDate(value)} · ${fmtTime(value)}`;
  }

  function formatCountdown(value) {
    const diff = new Date(value).getTime() - Date.now();
    if (!Number.isFinite(diff)) return "";
    if (diff <= 0) return "Kicked off";
    const mins = Math.floor(diff / 60000);
    const days = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const minutes = mins % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${pad(minutes)}m`;
    if (minutes > 0) return `${minutes}m`;
    return "< 1m";
  }

  function timeAgo(date) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins === 1) return "1 min ago";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    return `${hours} h ago`;
  }

  /* ---------- icons ---------- */
  const ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    close: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    arrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    arrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>',
    pin: '<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>',
    activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    swap: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4.1 2.9-1.6 4.8H9.5L7.9 9.9z"/><path d="M12 3v4M4.2 9.2l3.7 1.3M19.8 9.2l-3.7 1.3M7.2 20.1l2.3-4.2M16.8 20.1l-2.3-4.2"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  };

  function icon(name, className = "") {
    const body = ICONS[name] || "";
    return `<svg class="icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  /* ---------- crests and avatars ---------- */
  function luminance(hex) {
    const clean = String(hex || "").replace("#", "");
    if (clean.length !== 6) return 0.5;
    const rgb = [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16) / 255);
    const [r, g, b] = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function inkFor(hex) {
    return luminance(hex) > 0.55 ? "#0b1512" : "#ffffff";
  }

  function crest(team, size = "md", extra = "") {
    if (!team) return "";
    const colors = team.colors || ["#0e5a3a", "#f2c230"];
    const style = `--crest-1:${colors[0]};--crest-2:${colors[1]};--crest-ink:${inkFor(colors[0])}`;
    return `<span class="crest crest-${size} ${extra}" style="${style}" aria-hidden="true"><span class="crest-code">${esc(team.short || team.name.slice(0, 3).toUpperCase())}</span></span>`;
  }

  function avatar(player, size = "md") {
    if (!player) return "";
    const colors = (player.team && player.team.colors) || ["#0e5a3a", "#f2c230"];
    const initials = player.name.split(" ").map((part) => part[0]).slice(0, 2).join("");
    return `<span class="avatar avatar-${size}" style="--av-1:${colors[0]};--av-2:${colors[1]};--av-ink:${inkFor(colors[0])}" aria-hidden="true">${esc(initials)}</span>`;
  }

  /* ---------- page links ---------- */
  const url = {
    home: `${ROOT}index.html`,
    matches: `${ROOT}index.html`,
    leagues: `${ROOT}leagues/index.html`,
    league: (id) => `${ROOT}leagues/index.html?league=${encodeURIComponent(id)}`,
    team: (id) => `${ROOT}team/index.html?id=${encodeURIComponent(id)}`,
    match: (id) => `${ROOT}match/index.html?id=${encodeURIComponent(id)}`,
    players: `${ROOT}players/index.html`,
    player: (id) => `${ROOT}player/index.html?id=${encodeURIComponent(id)}`,
    compare: (a, b) => {
      const params = new URLSearchParams();
      if (a) params.set("a", a);
      if (b) params.set("b", b);
      const query = params.toString();
      return `${ROOT}compare/index.html${query ? `?${query}` : ""}`;
    },
    comparePage: `${ROOT}compare/index.html`,
    reminders: `${ROOT}reminders/index.html`,
    about: `${ROOT}about/index.html`,
  };

  function param(name, fallback = "") {
    try {
      const value = new URLSearchParams(window.location.search).get(name);
      return value === null ? fallback : value;
    } catch (e) {
      return fallback;
    }
  }

  function setParams(values) {
    try {
      const current = new URL(window.location.href);
      Object.entries(values).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") current.searchParams.delete(key);
        else current.searchParams.set(key, value);
      });
      window.history.replaceState(null, "", current.toString());
    } catch (e) { /* file:// pages may block history updates - harmless */ }
  }

  /* ---------- reminders ---------- */
  function normaliseReminder(entry) {
    if (!entry || !entry.id) return null;
    return {
      id: entry.id,
      kickoff: entry.kickoff || null,
      home: entry.home || "",
      away: entry.away || "",
      homeId: entry.homeId || null,
      awayId: entry.awayId || null,
      league: entry.league || "",
      leagueId: entry.leagueId || null,
      delivery: entry.delivery === "website" ? "website" : "email",
      addedAt: entry.addedAt || new Date().toISOString(),
    };
  }

  function getReminders() {
    try {
      const list = JSON.parse(localStorage.getItem(REM_KEY)) || [];
      return list.map(normaliseReminder).filter(Boolean).map((reminder) => {
        // Demo kick-off times shift with the session; keep saved reminders
        // aligned with the current match data when the match still exists.
        if (typeof Store !== "undefined" && Store.match) {
          const match = Store.match(reminder.id);
          if (match) {
            return {
              ...reminder,
              kickoff: match.kickoff,
              home: match.home.name,
              away: match.away.name,
              league: match.league ? match.league.name : reminder.league,
              leagueId: match.leagueId,
            };
          }
        }
        return reminder;
      });
    } catch (e) {
      return [];
    }
  }

  function saveReminders(list) {
    try {
      localStorage.setItem(REM_KEY, JSON.stringify(list));
    } catch (e) { /* storage may be full or blocked */ }
    updateBell();
    document.dispatchEvent(new CustomEvent("matchday:reminders", { detail: list }));
  }

  function hasReminder(matchId) {
    return getReminders().some((r) => r.id === matchId);
  }

  function matchSnapshot(match) {
    return {
      id: match.id,
      kickoff: match.kickoff,
      home: match.home.name,
      away: match.away.name,
      homeId: match.home.id,
      awayId: match.away.id,
      league: match.league ? match.league.name : "",
      leagueId: match.leagueId,
      delivery: "email",
      addedAt: new Date().toISOString(),
    };
  }

  function addReminder(match) {
    const list = getReminders();
    if (list.some((r) => r.id === match.id)) return false;
    list.push(matchSnapshot(match));
    saveReminders(list);
    return true;
  }

  function removeReminder(matchId) {
    const list = getReminders();
    const next = list.filter((r) => r.id !== matchId);
    saveReminders(next);
    return next.length !== list.length;
  }

  function toggleReminder(match) {
    if (!match) return false;
    if (hasReminder(match.id)) {
      removeReminder(match.id);
      return false;
    }
    addReminder(match);
    return true;
  }

  function updateReminderDelivery(matchId, delivery) {
    const list = getReminders();
    const item = list.find((r) => r.id === matchId);
    if (!item) return;
    item.delivery = delivery === "website" ? "website" : "email";
    saveReminders(list);
  }

  function getSettings() {
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}) };
    } catch (e) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    const next = { ...getSettings(), ...settings };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (e) { /* ignore */ }
    return next;
  }

  /* ---------- toasts ---------- */
  let toastHost = null;

  function toast(message, options = {}) {
    if (!toastHost) {
      toastHost = document.createElement("div");
      toastHost.className = "toast-host";
      toastHost.setAttribute("aria-live", "polite");
      toastHost.setAttribute("aria-atomic", "false");
      document.body.appendChild(toastHost);
    }
    const el = document.createElement("div");
    el.className = "toast";
    const iconName = options.icon || "check";
    el.innerHTML = `<span class="toast-icon">${icon(iconName)}</span>
      <span class="toast-copy">${esc(message)}</span>`;
    if (options.action && options.action.label) {
      const action = document.createElement("button");
      action.type = "button";
      action.className = "toast-action";
      action.textContent = options.action.label;
      action.addEventListener("click", () => {
        options.action.onClick();
        el.classList.add("toast-out");
        setTimeout(() => el.remove(), 200);
      });
      el.appendChild(action);
    }
    toastHost.appendChild(el);
    while (toastHost.children.length > 3) toastHost.firstElementChild.remove();
    requestAnimationFrame(() => el.classList.add("toast-in"));
    setTimeout(() => {
      el.classList.add("toast-out");
      setTimeout(() => el.remove(), 250);
    }, options.duration || 3800);
  }

  /* ---------- theme ---------- */
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function paintThemeButton() {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const dark = currentTheme() === "dark";
    button.innerHTML = icon(dark ? "sun" : "moon");
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.setAttribute("title", dark ? "Light theme" : "Dark theme");
    button.setAttribute("aria-pressed", String(dark));
  }

  function setupTheme() {
    paintThemeButton();
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    button.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
      paintThemeButton();
    });
  }

  /* ---------- match presentation helpers ---------- */
  function liveMinuteText(match) {
    const minute = Store.liveMinute(match);
    if (minute >= 90) return "90+";
    return `${minute}'`;
  }

  function statusBadge(match) {
    if (match.status === "live") {
      return `<span class="badge badge-live"><span class="live-dot"></span>LIVE
        <span data-live-minute="${esc(match.id)}">${liveMinuteText(match)}</span></span>`;
    }
    if (match.status === "finished") {
      return `<span class="badge badge-ft">Full time</span>`;
    }
    return `<span class="badge badge-soon">${icon("clock")}${esc(fmtTime(match.kickoff))}</span>`;
  }

  function scoreBlock(match) {
    if (match.status === "upcoming" || !match.score) {
      return `<span class="score score-time">${esc(fmtTime(match.kickoff))}</span>`;
    }
    return `<span class="score">${match.score.home}<span class="score-sep">-</span>${match.score.away}</span>`;
  }

  function goalText(match) {
    if (!match.score) return "";
    return `${match.score.home} - ${match.score.away}`;
  }

  function resultFor(match, teamId) {
    if (!match.score) return "";
    const home = match.home.id === teamId;
    const own = home ? match.score.home : match.score.away;
    const other = home ? match.score.away : match.score.home;
    return own > other ? "W" : own === other ? "D" : "L";
  }

  function roundLabel(match) {
    return match.round ? `Matchweek ${match.round}` : match.league ? match.league.name : "";
  }

  function remindButton(match, labels = {}) {
    if (!match || match.status !== "upcoming") return "";
    const on = hasReminder(match.id);
    return `<button type="button" class="btn btn-sm btn-outline remind-btn ${on ? "is-on" : ""}"
      data-remind="${esc(match.id)}"
      data-label-on="${esc(labels.on || "Reminder set")}"
      data-label-off="${esc(labels.off || "Remind me")}"
      aria-pressed="${on}">
      <span class="remind-icon remind-off">${icon("bell")}</span>
      <span class="remind-icon remind-on">${icon("check")}</span>
      <span class="remind-label">${esc(on ? (labels.on || "Reminder set") : (labels.off || "Remind me"))}</span>
    </button>`;
  }

  function syncRemindButtons() {
    document.querySelectorAll("[data-remind]").forEach((button) => {
      const on = hasReminder(button.dataset.remind);
      button.classList.toggle("is-on", on);
      button.setAttribute("aria-pressed", String(on));
      const label = button.querySelector(".remind-label") || button.querySelector("span");
      const text = on ? (button.dataset.labelOn || "Reminder set")
        : (button.dataset.labelOff || "Remind me");
      if (label) label.textContent = text;
    });
  }

  function matchCard(match, index = 0) {
    const live = match.status === "live";
    const homeWin = match.score && match.score.home > match.score.away;
    const awayWin = match.score && match.score.away > match.score.home;
    return `<article class="match-card ${live ? "is-live" : ""}" style="--i:${index}">
      <a class="match-card-link" href="${url.match(match.id)}" aria-label="${esc(match.home.name)} versus ${esc(match.away.name)}"></a>
      <div class="match-card-top">
        <span class="match-league">${esc(match.league ? match.league.name : "")}</span>
        <span class="match-round">${esc(roundLabel(match))}</span>
        ${statusBadge(match)}
      </div>
      <div class="match-teams">
        <div class="match-team ${homeWin ? "is-winner" : ""}">
          ${crest(match.homeTeam, "sm")}
          <span class="team-name">${esc(match.home.name)}</span>
          <span class="team-score">${match.score ? match.score.home : "–"}</span>
        </div>
        <div class="match-team ${awayWin ? "is-winner" : ""}">
          ${crest(match.awayTeam, "sm")}
          <span class="team-name">${esc(match.away.name)}</span>
          <span class="team-score">${match.score ? match.score.away : "–"}</span>
        </div>
      </div>
      <div class="match-card-foot">
        <span class="match-when">${icon("calendar")}${esc(kickoffLabel(match.kickoff))}</span>
        <span class="match-actions">
          ${remindButton(match)}
          <a class="btn btn-sm btn-ghost" href="${url.match(match.id)}">Match centre ${icon("chevronRight")}</a>
        </span>
      </div>
    </article>`;
  }

  function fixtureRow(match, options = {}) {
    const side = (team, goals) => `<span class="fixture-team">
      ${crest(team, "xs")}<span>${esc(team.name)}</span>
      <b>${match.score ? goals : ""}</b></span>`;
    return `<div class="fixture-row">
      <a class="fixture-link" href="${url.match(match.id)}"
        aria-label="${esc(match.home.name)} versus ${esc(match.away.name)}"></a>
      <span class="fixture-when">
        <b>${esc(dayLabel(match.kickoff))}</b>
        <span>${esc(fmtTime(match.kickoff))}</span>
      </span>
      <span class="fixture-teams">
        ${side(match.homeTeam, match.score ? match.score.home : 0)}
        ${side(match.awayTeam, match.score ? match.score.away : 0)}
      </span>
      ${match.status === "upcoming"
        ? (options.remind ? remindButton(match, { off: "Remind", on: "Saved" }) : "")
        : `<span class="fixture-status">${statusBadge(match)}</span>`}
    </div>`;
  }

  /* ---------- shared UI helpers ---------- */
  function ratingClass(rating) {
    if (!rating) return "";
    if (rating >= 7.5) return "high";
    if (rating >= 6.8) return "mid";
    return "low";
  }

  function formDots(form) {
    if (!form || !form.length) return `<span class="muted">—</span>`;
    return `<span class="form-dots">${form.map((result) =>
      `<span class="form-dot ${result}" title="${result === "W" ? "Win" : result === "D" ? "Draw" : "Loss"}">${result}</span>`).join("")}</span>`;
  }

  function emptyState({ iconName = "search", title, text, ctaLabel, ctaHref, ctaId }) {
    return `<div class="empty-state">
      <div class="empty-icon">${icon(iconName)}</div>
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${ctaLabel ? (ctaHref
        ? `<a class="btn btn-primary" href="${ctaHref}">${esc(ctaLabel)}</a>`
        : `<button class="btn btn-primary" type="button" ${ctaId ? `id="${ctaId}"` : ""}>${esc(ctaLabel)}</button>`) : ""}
    </div>`;
  }

  function setupTabs(scope = document) {
    scope.querySelectorAll("[data-tabs]").forEach((group) => {
      const buttons = [...group.querySelectorAll("[data-tab]")];
      const panelRoot = document.querySelector(group.dataset.tabs)
        || group.parentElement.querySelector("[data-tab-panels]")
        || group.parentElement;
      const panels = [...panelRoot.querySelectorAll("[data-panel]")];
      if (!buttons.length) return;

      const activate = (name, focus = false) => {
        buttons.forEach((button) => {
          const active = button.dataset.tab === name;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-selected", String(active));
          button.tabIndex = active ? 0 : -1;
          if (active && focus) button.focus();
        });
        panels.forEach((panel) => {
          panel.hidden = panel.dataset.panel !== name;
        });
        group.dispatchEvent(new CustomEvent("tabchange", { detail: name, bubbles: true }));
      };

      buttons.forEach((button, index) => {
        button.addEventListener("click", () => activate(button.dataset.tab));
        button.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
          event.preventDefault();
          let next = index;
          if (event.key === "ArrowRight") next = (index + 1) % buttons.length;
          if (event.key === "ArrowLeft") next = (index - 1 + buttons.length) % buttons.length;
          if (event.key === "Home") next = 0;
          if (event.key === "End") next = buttons.length - 1;
          activate(buttons[next].dataset.tab, true);
        });
      });

      const initially = buttons.find((button) => button.classList.contains("is-active"))
        || buttons[0];
      activate(initially.dataset.tab);
    });
  }

  /* ---------- header / footer ---------- */
  const NAV = [
    ["Matches", "matches"],
    ["Leagues", "leagues"],
    ["Players", "players"],
    ["Compare", "comparePage"],
    ["Reminders", "reminders"],
  ];
  const NAV_PARENT = {
    Matches: "Matches", Match: "Matches",
    Leagues: "Leagues", Team: "Leagues",
    Players: "Players", Player: "Players", Compare: "Compare",
    Reminders: "Reminders", About: "",
  };

  function brandMarkup() {
    return `<span class="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 40 44" fill="none"><path d="M20 2 37 8v13c0 10-7.4 17.6-17 21.5C10.4 38.6 3 31 3 21V8z" fill="currentColor" opacity=".18"/><path d="M20 2 37 8v13c0 10-7.4 17.6-17 21.5C10.4 38.6 3 31 3 21V8z" stroke="currentColor" stroke-width="2"/><path d="M13 14h14M13 20h9M13 26h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
    </span>`;
  }

  function drawChrome() {
    const active = NAV_PARENT[document.body.dataset.page] || "";
    const header = document.getElementById("site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="header-inner">
          <a class="brand" href="${url.home}" aria-label="Matchday home">
            ${brandMarkup()}
            <span class="brand-copy"><strong>MATCHDAY</strong><small>football, live</small></span>
          </a>
          <nav class="nav" id="primary-nav" aria-label="Primary navigation">
            ${NAV.map(([label, key]) => `<a href="${url[key]}" class="nav-link ${active === label ? "is-active" : ""}"
              ${active === label ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
          </nav>
          <div class="header-actions">
            <button class="icon-btn search-open" id="search-open" type="button" aria-label="Search" aria-controls="search-results" aria-expanded="false">${icon("search")}</button>
            <div class="header-search" id="header-search">
              ${icon("search", "search-glyph")}
              <input id="site-search" type="search" placeholder="Search teams, players"
                autocomplete="off" aria-label="Search teams, players, leagues and matches" aria-controls="search-results" aria-expanded="false">
              <kbd>/</kbd>
            </div>
            <button class="icon-btn theme-toggle" id="theme-toggle" type="button"></button>
            <a class="icon-btn bell" href="${url.reminders}" aria-label="My reminders">
              ${icon("bell")}<span class="bell-count" id="bell-count" hidden>0</span>
            </a>
            <button class="icon-btn menu-toggle" id="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-nav" aria-label="Open menu">${icon("menu")}</button>
          </div>
        </div>
        <div class="search-panel" id="search-results" role="listbox" aria-label="Search results" hidden></div>`;
      setupSearch();
      setupMobileNav();
    }

    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      footer.innerHTML = `
        <div class="footer-inner">
          <div class="footer-brand">
            <a class="brand brand-footer" href="${url.home}">
              ${brandMarkup()}
              <span class="brand-copy"><strong>MATCHDAY</strong><small>football, live</small></span>
            </a>
            <p>Live scores, fixtures and player stats for football fans — one clean place to follow every match.</p>
            <span class="footer-badge">${icon("info")}Sample data while we finish the live feed</span>
          </div>
          <div class="footer-col">
            <h4>Explore</h4>
            <ul>
              <li><a href="${url.matches}">Matches &amp; scores</a></li>
              <li><a href="${url.leagues}">Leagues &amp; standings</a></li>
              <li><a href="${url.players}">Player stats</a></li>
              <li><a href="${url.comparePage}">Compare players</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Your matchday</h4>
            <ul>
              <li><a href="${url.reminders}">My reminders</a></li>
              <li><a href="${url.players}?sort=goals">Top scorers</a></li>
              <li><a href="${url.about}">About &amp; contact</a></li>
              <li><a href="${url.about}#credits">Data credits</a></li>
            </ul>
          </div>
          <div class="footer-col footer-note">
            <h4>Project</h4>
            <p>Sports Information Platform — a nine-page IICT project for <strong>BS(AI)-1A</strong>, Fall 2026.</p>
            <p class="footer-small">Built by Talha Moin, Zain Khan and Zaid Ahmed.</p>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Matchday · Introduction to Information &amp; Communication Technologies</span>
          <span>Football only · More sports coming soon</span>
        </div>`;
    }

    updateBell();
    setupTheme();
  }

  /* ---------- global search ---------- */
  function resultHref(item) {
    if (item.type === "Player") return url.player(item.id);
    if (item.type === "Team") return url.team(item.id);
    if (item.type === "League") return url.league(item.id);
    if (item.type === "Match") return url.match(item.id);
    return url.home;
  }

  const TYPE_ICON = { Player: "users", Team: "shield", League: "trophy", Match: "ball" };
  const TYPE_LABEL = { Player: "Players", Team: "Teams", League: "Leagues", Match: "Matches" };

  function setupSearch() {
    const input = document.getElementById("site-search");
    const panel = document.getElementById("search-results");
    const openButton = document.getElementById("search-open");
    if (!input || !panel) return;

    let activeIndex = -1;
    let currentResults = [];

    const close = () => {
      panel.hidden = true;
      input.setAttribute("aria-expanded", "false");
      if (openButton) openButton.setAttribute("aria-expanded", "false");
      activeIndex = -1;
    };

    const open = () => {
      if (panel.hidden) {
        panel.hidden = false;
        input.setAttribute("aria-expanded", "true");
        if (openButton) openButton.setAttribute("aria-expanded", "true");
      }
    };

    const paint = (query) => {
      const results = Store.search(query);
      currentResults = results;
      activeIndex = -1;
      if (!query || query.trim().length < 2) {
        panel.innerHTML = `<p class="search-hint">${icon("search")}Type at least two letters to search 40 clubs, 560 players, 5 leagues and 280 matches.</p>`;
        open();
        return;
      }
      if (!results.length) {
        panel.innerHTML = `<p class="search-empty">No results for “${esc(query)}”. Try a club, player or league name.</p>`;
        open();
        return;
      }
      const grouped = results.reduce((map, item) => {
        (map[item.type] = map[item.type] || []).push(item);
        return map;
      }, {});
      let index = 0;
      panel.innerHTML = Object.entries(grouped).map(([type, items]) => `
        <div class="search-group">
          <p class="search-group-title">${esc(TYPE_LABEL[type] || type)}</p>
          ${items.map((item) => {
            const i = index++;
            return `<a class="search-result" href="${resultHref(item)}" data-index="${i}" role="option">
              <span class="search-result-icon">${icon(TYPE_ICON[type] || "search")}</span>
              <span class="search-result-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span>
              ${icon("arrowRight", "search-result-go")}
            </a>`;
          }).join("")}
        </div>`).join("");
      open();
    };

    input.addEventListener("input", () => {
      paint(input.value);
      document.dispatchEvent(new CustomEvent("matchday:search", {
        detail: input.value.trim().toLowerCase(),
      }));
    });

    input.addEventListener("focus", () => {
      paint(input.value);
    });

    input.addEventListener("keydown", (event) => {
      const options = [...panel.querySelectorAll(".search-result")];
      if (event.key === "ArrowDown" && options.length) {
        event.preventDefault();
        activeIndex = (activeIndex + 1) % options.length;
        options.forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
        options[activeIndex].scrollIntoView({ block: "nearest" });
      } else if (event.key === "ArrowUp" && options.length) {
        event.preventDefault();
        activeIndex = (activeIndex - 1 + options.length) % options.length;
        options.forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
        options[activeIndex].scrollIntoView({ block: "nearest" });
      } else if (event.key === "Enter" && activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        window.location.href = options[activeIndex].getAttribute("href");
      } else if (event.key === "Escape") {
        close();
        input.blur();
      }
    });

    if (openButton) {
      openButton.addEventListener("click", () => {
        document.body.classList.toggle("search-open");
        if (document.body.classList.contains("search-open")) {
          input.focus();
          paint(input.value);
        } else {
          close();
        }
      });
    }

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".header-search") && !event.target.closest("#search-results")
        && !event.target.closest("#search-open")) {
        close();
        document.body.classList.remove("search-open");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
        event.preventDefault();
        document.body.classList.add("search-open");
        input.focus();
      }
      if (event.key === "Escape") {
        close();
        document.body.classList.remove("search-open", "nav-open");
        const menu = document.getElementById("menu-toggle");
        if (menu) {
          menu.setAttribute("aria-expanded", "false");
          menu.innerHTML = icon("menu");
        }
      }
    });
  }

  /* ---------- mobile navigation ---------- */
  function setupMobileNav() {
    const button = document.getElementById("menu-toggle");
    if (!button) return;
    const close = () => {
      document.body.classList.remove("nav-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
      button.innerHTML = icon("menu");
    };
    button.addEventListener("click", () => {
      const open = document.body.classList.toggle("nav-open");
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      button.innerHTML = icon(open ? "close" : "menu");
    });
    const nav = document.getElementById("primary-nav");
    if (nav) nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) close();
    });
    document.addEventListener("matchday:search", close);
    document.addEventListener("click", (event) => {
      if (!document.body.classList.contains("nav-open")) return;
      if (!event.target.closest(".site-header")) close();
    });
  }

  function updateBell() {
    const el = document.getElementById("bell-count");
    if (!el) return;
    const count = getReminders().length;
    el.textContent = count;
    el.hidden = count === 0;
    const bell = el.closest(".bell");
    if (bell) bell.setAttribute("aria-label", `My reminders (${count} saved)`);
  }

  /* ---------- live ticker and countdowns ---------- */
  function tick() {
    document.querySelectorAll("[data-live-minute]").forEach((el) => {
      const match = Store.match(el.dataset.liveMinute);
      if (match && match.status === "live") el.textContent = liveMinuteText(match);
    });
    document.querySelectorAll("[data-live-progress]").forEach((el) => {
      const match = Store.match(el.dataset.liveProgress);
      if (match && match.status === "live") {
        el.style.width = `${Math.min(100, (Store.liveMinute(match) / 90) * 100)}%`;
      }
    });
    document.querySelectorAll("[data-countdown]").forEach((el) => {
      el.textContent = formatCountdown(el.dataset.countdown);
    });
    document.querySelectorAll("[data-relative]").forEach((el) => {
      el.textContent = timeAgo(el.dataset.relative);
    });
    const updated = document.querySelectorAll("[data-updated]");
    updated.forEach((el) => { el.textContent = timeAgo(Store.updatedAt); });
  }

  function setupTicker() {
    tick();
    setInterval(tick, 1000);
    document.addEventListener("matchday:reminders", () => {
      updateBell();
      syncRemindButtons();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === REM_KEY) {
        updateBell();
        syncRemindButtons();
        document.dispatchEvent(new CustomEvent("matchday:reminders", { detail: getReminders() }));
      }
    });
    // one gentle toast when an "on website" reminder actually falls due
    setInterval(() => {
      if (document.body.dataset.page !== "Reminders" && document.body.dataset.page !== "Matches") return;
      getReminders().forEach((reminder) => {
        if (reminder.delivery !== "website") return;
        const diff = new Date(reminder.kickoff).getTime() - Date.now();
        const settings = getSettings();
        if (diff > 0 && diff <= settings.leadMinutes * 60000 && !notified.has(reminder.id)) {
          notified.add(reminder.id);
          toast(`${reminder.home} v ${reminder.away} kicks off soon`, { icon: "bell", duration: 6000 });
        }
      });
    }, 30000);
  }

  /* ---------- global interactions ---------- */
  function setupGlobalClicks() {
    document.addEventListener("click", (event) => {
      const remind = event.target.closest("[data-remind]");
      if (remind) {
        event.preventDefault();
        const match = Store.match(remind.dataset.remind);
        if (!match) return;
        const added = toggleReminder(match);
        syncRemindButtons();
        toast(added
          ? `Reminder set for ${match.home.name} v ${match.away.name}`
          : `Reminder removed for ${match.home.name} v ${match.away.name}`,
        { icon: added ? "check" : "trash" });
        return;
      }
      const copy = event.target.closest("[data-copy]");
      if (copy) {
        event.preventDefault();
        const text = copy.dataset.copy || window.location.href;
        const done = () => toast("Link copied to clipboard", { icon: "copy" });
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(() => toast("Could not copy the link", { icon: "alert" }));
        } else {
          toast("Copy the address bar link to share this page", { icon: "info" });
        }
      }
      const addAll = event.target.closest("[data-remind-all]");
      if (addAll) {
        event.preventDefault();
        let added = 0;
        document.querySelectorAll("[data-remind]").forEach((button) => {
          if (button.classList.contains("is-on")) return;
          const match = Store.match(button.dataset.remind);
          if (match && addReminder(match)) added += 1;
        });
        syncRemindButtons();
        toast(added ? `${added} reminder${added === 1 ? "" : "s"} added` : "Those reminders are already saved", { icon: "bell" });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    drawChrome();
    setupGlobalClicks();
    setupTicker();
  });

  return {
    esc,
    icon,
    crest,
    avatar,
    url,
    param,
    setParams,
    fmtTime,
    fmtDate,
    fmtDateLong,
    fmtDateTime,
    dayLabel,
    kickoffLabel,
    formatCountdown,
    timeAgo,
    statusBadge,
    scoreBlock,
    goalText,
    resultFor,
    roundLabel,
    remindButton,
    syncRemindButtons,
    matchCard,
    fixtureRow,
    getReminders,
    hasReminder,
    addReminder,
    removeReminder,
    toggleReminder,
    updateReminderDelivery,
    getSettings,
    saveSettings,
    toast,
    inkFor,
    liveMinuteText,
    ratingClass,
    formDots,
    emptyState,
    setupTabs,
  };
})();
