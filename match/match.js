/* ============================================================
   match.js - logic for Page 2 (Match Detail).
   The address looks like  match/index.html?id=s1
   We read the "id", find that match, then draw the page.
   ============================================================ */
const $ = (id) => document.getElementById(id);
const E = Matchday.esc; // short name for the "safe text" helper

const matchId = new URLSearchParams(location.search).get("id");
const match = window.MATCHDAY_DATA.matches.find((m) => m.id === matchId);
const detail = (window.MATCH_DETAILS || {})[matchId]; // may be undefined

let activeTab = "summary";

/* ---------- Scoreboard (top green box) ---------- */
function scoreboardHTML() {
  const m = match;
  const hasScore = m.score !== null;
  const middle = hasScore
    ? `<div class="sb-score">${m.score.home} - ${m.score.away}</div>`
    : `<div class="sb-score time">${Matchday.fmtTime(m.kickoff)}</div>`;

  let status = "";
  if (m.status === "live") status = `<span class="badge live">LIVE ${m.minute}'</span>`;
  else if (m.status === "finished") status = `<span class="badge ft">Full time</span>`;
  else {
    const on = Matchday.hasReminder(m.id);
    status = `<button class="btn ${on ? "on" : ""}" id="remind-btn">${on ? "Reminder set" : "Remind me"}</button>`;
  }

  return `
    <section class="scoreboard">
      <div class="sb-meta">${E(m.league)} - ${Matchday.fmtDate(m.kickoff)}${detail ? " - " + E(detail.venue) : ""}</div>
      <div class="sb-row">
        <div class="sb-team"><span class="crest">${E(m.home.short)}</span>${E(m.home.name)}</div>
        ${middle}
        <div class="sb-team"><span class="crest">${E(m.away.short)}</span>${E(m.away.name)}</div>
      </div>
      <div class="sb-status">${status}</div>
    </section>`;
}

/* ---------- Summary tab: events timeline ---------- */
function summaryHTML() {
  if (!detail || !detail.events.length) return `<p class="empty">No match events in this snapshot.</p>`;
  const label = { goal: "Goal", yellow: "Yellow card", red: "Red card" };
  return `<ul class="events">${detail.events.map((ev) => {
    const team = ev.team === "home" ? match.home.name : match.away.name;
    return `<li><span class="ev-min">${ev.minute}'</span><span>${label[ev.type] || ev.type} - ${E(ev.player)} (${E(team)})</span></li>`;
  }).join("")}</ul>`;
}

/* ---------- Player stats tab: one table per team ---------- */
function tableHTML(teamName, rows) {
  return `
    <h3>${E(teamName)}</h3>
    <div class="table-wrap"><table class="stats">
      <thead><tr><th>Player</th><th>Pos</th><th>Min</th><th>Goals</th><th>Assists</th><th>Shots</th></tr></thead>
      <tbody>${rows.map((p) => `<tr><td>${E(p.name)}</td><td>${E(p.pos)}</td><td>${p.minutes}</td><td>${p.goals}</td><td>${p.assists}</td><td>${p.shots}</td></tr>`).join("")}</tbody>
    </table></div>`;
}
function playersHTML() {
  if (!detail) return `<p class="empty">No player stats in this snapshot.</p>`;
  return `<div class="panel">${tableHTML(match.home.name, detail.players.home)}</div>
          <div class="panel">${tableHTML(match.away.name, detail.players.away)}</div>`;
}

/* ---------- Draw everything ---------- */
function render() {
  if (!match) {
    $("match").innerHTML = `<h1 class="page-title">Match not found</h1><p class="empty">This match isn't in the data. <a href="../index.html">Go back to all matches</a>.</p>`;
    return;
  }
  document.title = `${match.home.name} v ${match.away.name} - Matchday`;
  $("match").innerHTML = scoreboardHTML() + `
    <div class="tabs" role="tablist">
      <button class="tab" role="tab" data-tab="summary" aria-selected="${activeTab === "summary"}">Summary</button>
      <button class="tab" role="tab" data-tab="players" aria-selected="${activeTab === "players"}">Player stats</button>
    </div>
    <div class="panel" ${activeTab === "players" ? "hidden" : ""}>${summaryHTML()}</div>
    ${activeTab === "players" ? playersHTML() : ""}`;
}

/* ---------- Clicks ---------- */
document.addEventListener("click", (e) => {
  const tab = e.target.closest("[data-tab]");
  if (tab) { activeTab = tab.dataset.tab; render(); }
  if (e.target.closest("#remind-btn")) { Matchday.toggleReminder(match); render(); }
});

$("sample-notice").hidden = !window.MATCHDAY_DATA.isSample;
render();
