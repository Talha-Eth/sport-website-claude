/* ============================================================
   home.js - Page 1, the Matches & Scores Hub.
   Filters: sport, league and date. Matches are grouped into
   Live now, Upcoming and Finished, with a sidebar for leagues,
   saved reminders and the scoring chart.
   ============================================================ */
const $ = (id) => document.getElementById(id);

const LIMITS = { live: 4, upcoming: 6, finished: 6 };
const STEPS = { live: 6, upcoming: 12, finished: 12 };
const state = { league: "all", date: "all", search: "", extra: { live: 0, upcoming: 0, finished: 0 } };

const notice = $("sample-notice");
if (notice) {
  notice.hidden = !Store.isSample;
  notice.innerHTML = `${Matchday.icon("info")}<span><strong>Demo data.</strong> Clubs and stadiums are real; scores, tables, line-ups and player stats are simulated, and kick-offs are aligned to today so the demo always has live and upcoming matches. The layout is ready for a live football data feed.</span>`;
}

/* ---------- hero ---------- */
function renderHero() {
  const live = Store.liveMatches().sort((a, b) => b.minute - a.minute);
  const featured = live.find((m) => m.id === "pl-r13-1") || live[0];
  const box = $("hero-spotlight");
  if (!box) return;

  if (featured) {
    const homeWin = featured.score && featured.score.home > featured.score.away;
    const awayWin = featured.score && featured.score.away > featured.score.home;
    box.innerHTML = `
      <a class="match-card-link" href="${Matchday.url.match(featured.id)}" aria-label="Open ${Matchday.esc(featured.home.name)} versus ${Matchday.esc(featured.away.name)}"></a>
      <div class="hero-spotlight-head">
        <span>${Matchday.esc(featured.league.name)} · live now</span>
        <span class="badge badge-live"><span class="live-dot"></span><span data-live-minute="${featured.id}">${Matchday.liveMinuteText(featured)}</span></span>
      </div>
      <div class="spot-team ${homeWin ? "is-winner" : ""}">
        ${Matchday.crest(featured.homeTeam, "md")}
        <span class="team-name">${Matchday.esc(featured.home.name)}</span>
        <span class="team-score">${featured.score ? featured.score.home : 0}</span>
      </div>
      <div class="spot-team ${awayWin ? "is-winner" : ""}">
        ${Matchday.crest(featured.awayTeam, "md")}
        <span class="team-name">${Matchday.esc(featured.away.name)}</span>
        <span class="team-score">${featured.score ? featured.score.away : 0}</span>
      </div>
      <div class="spot-progress">
        <div class="spot-progress-labels">
          <span>${featured.minute <= 45 ? "First half" : "Second half"}</span>
          <span><span data-live-minute="${featured.id}">${Matchday.liveMinuteText(featured)}</span> / 90'</span>
        </div>
        <div class="spot-progress-track"><span data-live-progress="${featured.id}" style="width:${Math.min(100, (Store.liveMinute(featured) / 90) * 100)}%"></span></div>
      </div>
      <div class="spot-foot">
        <span>${Matchday.icon("pin")} ${Matchday.esc(featured.venue)}</span>
        <a class="spot-link" href="${Matchday.url.match(featured.id)}">Match centre ${Matchday.icon("arrowRight")}</a>
      </div>
      ${live.length > 1 ? `<div class="spot-also">
        <p class="spot-also-head">Also live now</p>
        ${live.filter((m) => m.id !== featured.id).slice(0, 3).map((m) => `
          <a class="spot-also-row" href="${Matchday.url.match(m.id)}">
            ${Matchday.crest(m.homeTeam, "xs")}
            <span class="spot-also-team">${Matchday.esc(m.home.short)} <b>${m.score ? m.score.home : 0}</b></span>
            <span class="spot-also-vs">v</span>
            <span class="spot-also-team away"><b>${m.score ? m.score.away : 0}</b> ${Matchday.esc(m.away.short)}</span>
            ${Matchday.crest(m.awayTeam, "xs")}
            <small data-live-minute="${m.id}">${Matchday.liveMinuteText(m)}</small>
          </a>`).join("")}
      </div>` : ""}`;
  } else {
    const next = Store.upcomingMatches(1)[0];
    box.innerHTML = next ? `
      <div class="hero-spotlight-head"><span>Next up</span><span class="badge badge-soon">${Matchday.icon("clock")}${Matchday.esc(Matchday.kickoffLabel(next.kickoff))}</span></div>
      <div class="spot-team">${Matchday.crest(next.homeTeam, "md")}<span class="team-name">${Matchday.esc(next.home.name)}</span></div>
      <div class="spot-team">${Matchday.crest(next.awayTeam, "md")}<span class="team-name">${Matchday.esc(next.away.name)}</span></div>
      <div class="spot-foot"><span>${Matchday.esc(next.league.name)}</span><a class="spot-link" href="${Matchday.url.match(next.id)}">Match centre ${Matchday.icon("arrowRight")}</a></div>`
      : `<p class="muted">No live matches right now.</p>`;
  }

  const reminders = Matchday.getReminders().length;
  $("hero-stats").innerHTML = `
    <div class="hero-stat"><strong>${live.length}</strong><span>Live now</span></div>
    <div class="hero-stat"><strong>${Store.leagues.length}</strong><span>Leagues</span></div>
    <div class="hero-stat"><strong>${Store.players.length}</strong><span>Players</span></div>
    <div class="hero-stat"><strong>${reminders}</strong><span>Your reminders</span></div>`;
}

/* ---------- filters ---------- */
function fillFilters() {
  $("f-league").innerHTML = `<option value="all">All leagues</option>`
    + Store.leagues.map((l) => `<option value="${l.id}">${Matchday.esc(l.name)}</option>`).join("");

  const seen = new Map();
  Store.matches.forEach((m) => {
    if (!seen.has(m.dateKey)) seen.set(m.dateKey, m.kickoff);
  });
  const dates = [...seen.entries()].sort((a, b) => new Date(a[1]) - new Date(b[1]));
  $("f-date").innerHTML = `<option value="all">All dates</option>`
    + dates.map(([key, iso]) => `<option value="${key}">${Matchday.esc(Matchday.dayLabel(iso))}</option>`).join("");

  $("f-league").addEventListener("change", (event) => {
    state.league = event.target.value;
    state.extra = { live: 0, upcoming: 0, finished: 0 };
    render();
  });
  $("f-date").addEventListener("change", (event) => {
    state.date = event.target.value;
    state.extra = { live: 0, upcoming: 0, finished: 0 };
    render();
  });
  $("f-sport").addEventListener("change", () => { /* more sports will be added later */ });
  $("clear-filters").addEventListener("click", resetFilters);
}

function resetFilters() {
  state.league = "all";
  state.date = "all";
  state.search = "";
  state.extra = { live: 0, upcoming: 0, finished: 0 };
  $("f-league").value = "all";
  $("f-date").value = "all";
  const search = $("site-search");
  if (search) search.value = "";
  render();
}

/* ---------- match list ---------- */
function filteredMatches() {
  return Store.matches.filter((match) => {
    if (state.league !== "all" && String(match.leagueId) !== state.league) return false;
    if (state.date !== "all" && match.dateKey !== state.date) return false;
    if (state.search) {
      const haystack = `${match.home.name} ${match.away.name} ${match.league ? match.league.name : ""}`.toLowerCase();
      if (!haystack.includes(state.search)) return false;
    }
    return true;
  });
}

function groupMarkup(key, title, emptyText, list) {
  const extra = state.extra[key] || 0;
  const limit = LIMITS[key] + extra;
  const visible = list.slice(0, limit);
  const cards = visible.map((match, index) => Matchday.matchCard(match, index)).join("");
  const remaining = list.length - limit;
  const more = remaining > 0
    ? `<button class="show-more" type="button" data-more="${key}">Show ${Math.min(remaining, STEPS[key])} more ${Matchday.icon("chevronDown")}</button>`
    : (extra > 0 ? `<button class="show-more" type="button" data-less="${key}">Show fewer</button>` : "");
  return `
    <div class="group-head">
      <h2 class="group-title">
        ${key === "live" ? '<span class="dot-live"></span>' : ""}
        ${title}
        <span class="count-pill">${list.length}</span>
      </h2>
      ${more}
    </div>
    ${cards ? `<div class="match-grid">${cards}</div>` : `<p class="empty">${emptyText}</p>`}`;
}

function renderSummary() {
  const summary = $("filter-summary");
  const parts = [];
  if (state.league !== "all") {
    const league = Store.league(state.league);
    parts.push(`League: ${Matchday.esc(league ? league.name : "")}`);
  }
  if (state.date !== "all") {
    const match = Store.matches.find((m) => m.dateKey === state.date);
    parts.push(`Date: ${Matchday.esc(match ? Matchday.dayLabel(match.kickoff) : state.date)}`);
  }
  if (state.search) parts.push(`Search: “${Matchday.esc(state.search)}”`);
  summary.hidden = parts.length === 0;
  summary.innerHTML = parts.map((part) => `<span class="tag">${part}</span>`).join("")
    + (parts.length ? `<button class="filter-clear" type="button" id="clear-inline">Clear all</button>` : "");
  const inline = $("clear-inline");
  if (inline) inline.addEventListener("click", resetFilters);
}

function render() {
  const shown = filteredMatches();
  const live = shown.filter((m) => m.status === "live")
    .sort((a, b) => a.leagueId - b.leagueId || b.minute - a.minute);
  const upcoming = shown.filter((m) => m.status === "upcoming")
    .sort((a, b) => a.kickoffDate - b.kickoffDate);
  const finished = shown.filter((m) => m.status === "finished")
    .sort((a, b) => b.kickoffDate - a.kickoffDate);

  $("matches-empty").hidden = shown.length !== 0;
  $("matches").innerHTML = shown.length === 0 ? "" : [
    groupMarkup("live", "Live now", "No live matches right now.", live),
    groupMarkup("upcoming", "Upcoming", "No upcoming matches for this filter.", upcoming),
    groupMarkup("finished", "Finished", "No finished matches for this filter.", finished),
  ].join("");

  if (shown.length === 0) {
    $("matches-empty").innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${Matchday.icon("search")}</div>
        <h3>No matches found</h3>
        <p>Try a different league or date, or clear the filters to see the full fixture list.</p>
        <button class="btn btn-primary" type="button" id="empty-reset">Reset filters</button>
      </div>`;
    const reset = $("empty-reset");
    if (reset) reset.addEventListener("click", resetFilters);
  }

  renderSummary();
  renderSidebarLeagues();
}

/* ---------- sidebar ---------- */
function renderSidebarLeagues() {
  const all = `<li>
    <button class="side-link ${state.league === "all" ? "is-on" : ""}" type="button" data-league="all">
      ${Matchday.icon("list")} All competitions <span class="count">${Store.matches.length}</span>
    </button></li>`;
  const items = Store.leagues.map((league) => {
    const color = league.color;
    const ink = Matchday.inkFor(color);
    return `<li>
      <button class="side-link ${state.league === String(league.id) ? "is-on" : ""}" type="button" data-league="${league.id}">
        <span class="league-badge" style="--league-1:${color};--league-2:${league.accent};--league-ink:${ink};width:26px;height:29px;font-size:0.68rem;">${Matchday.esc(league.short)}</span>
        ${Matchday.esc(league.name)} <span class="count">${Store.teamsInLeague(league.id).length}</span>
      </button></li>`;
  }).join("");
  $("side-leagues").innerHTML = all + items;
}

function renderSidebarReminders() {
  const list = Matchday.getReminders()
    .filter((r) => new Date(r.kickoff) > new Date())
    .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff))
    .slice(0, 3);
  $("side-reminders").innerHTML = list.length
    ? list.map((r) => `<li>
        <a href="${Matchday.url.match(r.id)}">
          <span>${Matchday.esc(r.home)} v ${Matchday.esc(r.away)}
            <br><small>${Matchday.esc(Matchday.kickoffLabel(r.kickoff))}</small></span>
          <span class="countdown" data-countdown="${r.kickoff}">${Matchday.formatCountdown(r.kickoff)}</span>
        </a></li>`).join("")
    : `<li class="empty">No reminders yet.<br><small>Press “Remind me” on any upcoming match.</small></li>`;
}

function renderSidebarScorers() {
  const chart = Store.scoringChart(null, 5);
  $("side-scorers").innerHTML = chart.map(({ player, stats }, index) => `
    <li>
      <a href="${Matchday.url.player(player.id)}">
        <span class="position-badge ${index < 3 ? "top" : ""}">${index + 1}</span>
        ${Matchday.crest(player.team, "xs")}
        <span>${Matchday.esc(player.name)}<br><small>${Matchday.esc(player.team.name)}</small></span>
        <span class="count">${stats.goals}</span>
      </a>
    </li>`).join("");
}

function renderSidebar() {
  renderSidebarLeagues();
  renderSidebarReminders();
  renderSidebarScorers();
}

/* ---------- events ---------- */
document.addEventListener("click", (event) => {
  const leagueButton = event.target.closest("[data-league]");
  if (leagueButton) {
    state.league = leagueButton.dataset.league;
    state.extra = { live: 0, upcoming: 0, finished: 0 };
    $("f-league").value = state.league;
    render();
    return;
  }
  const more = event.target.closest("[data-more]");
  if (more) {
    const key = more.dataset.more;
    state.extra[key] = (state.extra[key] || 0) + STEPS[key];
    render();
    return;
  }
  const less = event.target.closest("[data-less]");
  if (less) {
    state.extra[less.dataset.less] = 0;
    render();
  }
});

document.addEventListener("matchday:search", (event) => {
  state.search = event.detail;
  state.extra = { live: 0, upcoming: 0, finished: 0 };
  render();
});

document.addEventListener("matchday:reminders", () => {
  renderSidebarReminders();
  renderHero();
});

/* ---------- start ---------- */
fillFilters();
renderHero();
renderSidebar();
render();
