/* ============================================================
   home.js - logic for Page 1 (Matches & Scores Hub).
   ============================================================ */
const data = window.MATCHDAY_DATA;
const state = { league: "all", date: "all", search: "" };

const $ = (id) => document.getElementById(id);
const dayKey = (iso) => new Date(iso).toDateString();

/* ---------- Filter menus ---------- */
function fillFilters() {
  $("f-league").innerHTML += data.leagues.map((l) => `<option value="${l.id}">${Matchday.esc(l.name)}</option>`).join("");

  const days = [...new Set(data.matches.map((m) => dayKey(m.kickoff)))];
  $("f-date").innerHTML += days.map((d) => `<option value="${d}">${Matchday.fmtDate(d)}</option>`).join("");

  $("f-league").addEventListener("change", (e) => { state.league = e.target.value; render(); });
  $("f-date").addEventListener("change", (e) => { state.date = e.target.value; render(); });
  document.addEventListener("matchday:search", (e) => { state.search = e.detail; render(); });
}

/* ---------- One match card (Added Index for Animation Delay) ---------- */
function cardHTML(m, index) {
  const live = m.status === "live";
  const showScore = m.score !== null;
  const row = (team, goals) => `
    <div class="team">
      <span class="crest">${Matchday.esc(team.short)}</span>
      <span class="team-name">${Matchday.esc(team.name)}</span>
      ${showScore ? `<span class="score">${goals}</span>` : ""}
    </div>`;

  let side;
  if (live) side = `<span class="badge live">LIVE ${m.minute}'</span>`;
  else if (m.status === "finished") side = `<span class="badge ft">Full time</span>`;
  else {
    const on = Matchday.hasReminder(m.id);
    side = `<span class="kickoff">${Matchday.fmtTime(m.kickoff)}</span>
            <button class="btn ${on ? "" : "outline"}" data-remind="${m.id}">${on ? "Reminder set" : "Remind me"}</button>`;
  }

  // Stagger the animation delay based on the card's index
  const delay = index * 50; 

  return `
    <article class="match-card ${live ? "is-live" : ""}" style="animation-delay: ${delay}ms">
      <div>
        <div class="match-meta">${Matchday.esc(m.league)} - ${Matchday.fmtDate(m.kickoff)}</div>
        ${row(m.home, showScore ? m.score.home : "")}
        ${row(m.away, showScore ? m.score.away : "")}
      </div>
      <div class="match-side">${side}</div>
    </article>`;
}

/* ---------- Draw the three groups ---------- */
function render() {
  const shown = data.matches.filter((m) =>
    (state.league === "all" || String(m.leagueId) === state.league) &&
    (state.date === "all" || dayKey(m.kickoff) === state.date) &&
    (state.search === "" || (m.home.name + " " + m.away.name).toLowerCase().includes(state.search)));

  const groups = [
    ["live", "Live now", "No live matches right now."],
    ["upcoming", "Upcoming", "No upcoming matches for this filter."],
    ["finished", "Finished", "No finished matches for this filter."],
  ];
  
  let globalIndex = 0; // Reset index for staggered animation across groups
  
  $("matches").innerHTML = groups.map(([status, title, empty]) => {
    const list = shown.filter((m) => m.status === status);
    
    const listHTML = list.length 
      ? list.map((m) => { 
          const html = cardHTML(m, globalIndex); 
          globalIndex++; 
          return html; 
        }).join("") 
      : `<p class="empty">${empty}</p>`;

    return `<h2 class="group-title">${status === "live" ? '<span class="dot-live"></span>' : ""}${title}</h2>` + listHTML;
  }).join("");

  renderSidebar();
}

/* ---------- Sidebar ---------- */
function renderSidebar() {
  $("side-leagues").innerHTML =
    [{ id: "all", name: "All leagues" }, ...data.leagues].map((l) =>
      `<li><button data-league="${l.id}" class="${String(l.id) === state.league ? "on" : ""}">${Matchday.esc(l.name)}</button></li>`).join("");

  const next = Matchday.getReminders().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 3);
  $("side-reminders").innerHTML = next.length
    ? next.map((r) => `<li>${Matchday.esc(r.home)} v ${Matchday.esc(r.away)}<br><small>${Matchday.fmtDate(r.kickoff)}, ${Matchday.fmtTime(r.kickoff)}</small></li>`).join("")
    : `<li class="empty">No reminders yet. Press "Remind me" on an upcoming match.</li>`;
}

/* ---------- Clicks ---------- */
document.addEventListener("click", (e) => {
  const remind = e.target.closest("[data-remind]");
  if (remind) {
    Matchday.toggleReminder(data.matches.find((m) => m.id === remind.dataset.remind));
    render();
  }
  const league = e.target.closest("[data-league]");
  if (league) { state.league = league.dataset.league; $("f-league").value = state.league; render(); }
});

/* ---------- Start ---------- */
$("sample-notice").hidden = !data.isSample;
$("updated").textContent = "Data last updated: " + new Date(data.updatedAt).toLocaleString();
fillFilters();
render();