/* ============================================================
   leagues.js - Page 3, Leagues & Sports.
   Sport chips, a league browser, next fixtures, latest results
   and a live-computed standings table with form.
   ============================================================ */
const listRoot = document.getElementById("league-list");
const detailRoot = document.getElementById("league-detail");
const initialLeague = Matchday.param("league");
let currentLeague = Store.league(initialLeague) ? String(initialLeague) : String(Store.leagues[0].id);

document.getElementById("league-count").textContent = `${Store.leagues.length} competitions`;

function renderLeagueList() {
  listRoot.innerHTML = Store.leagues.map((league) => {
    const active = String(league.id) === currentLeague;
    const ink = Matchday.inkFor(league.color);
    return `<li>
      <a href="?league=${league.id}" class="${active ? "is-active" : ""}" data-league="${league.id}"
        ${active ? 'aria-current="page"' : ""}>
        <span class="league-badge" style="--league-1:${league.color};--league-2:${league.accent};--league-ink:${ink}">${Matchday.esc(league.short)}</span>
        <span class="league-name">${Matchday.esc(league.name)}<small>${Matchday.esc(league.country)}</small></span>
        <span class="league-count" title="${Store.teamsInLeague(league.id).length} clubs">${Store.teamsInLeague(league.id).length}</span>
      </a>
    </li>`;
  }).join("");
}

function fixturePanel(title, subtitle, matches, iconName) {
  return `<section class="panel" aria-label="${Matchday.esc(title)}">
    <div class="panel-head">
      <h3 style="display:flex;align-items:center;gap:7px;">${Matchday.icon(iconName)} ${Matchday.esc(title)}</h3>
      <span class="panel-sub">${Matchday.esc(subtitle)}</span>
    </div>
    ${matches.length
      ? `<div class="fixture-list">${matches.map((match) => Matchday.fixtureRow(match, { remind: true })).join("")}</div>`
      : `<p class="empty">No matches to show yet.</p>`}
  </section>`;
}

function scorersPanel(league, limit = 5) {
  const chart = Store.scoringChart(league.id, limit);
  return `<section class="panel" aria-label="Top scorers">
    <div class="panel-head">
      <h3>Top scorers</h3>
      <a class="panel-sub" href="${Matchday.url.players}?league=${league.id}&sort=goals">All players</a>
    </div>
    <ul class="side-list">
      ${chart.map(({ player, stats }, index) => `<li>
        <a href="${Matchday.url.player(player.id)}">
          <span class="position-badge ${index < 3 ? "top" : ""}">${index + 1}</span>
          ${Matchday.crest(player.team, "xs")}
          <span>${Matchday.esc(player.name)}<br><small>${Matchday.esc(player.team.name)} · ${stats.played} app${stats.played === 1 ? "" : "s"}</small></span>
          <span class="count">${stats.goals}</span>
        </a>
      </li>`).join("")}
    </ul>
  </section>`;
}

function standingsPanel(league) {
  const rows = Store.standings(league.id);
  const played = rows.reduce((sum, row) => sum + row.played, 0) / 2;
  return `<div class="table-wrap">
    <table class="data-table standings-table">
      <caption class="sr-only">${Matchday.esc(league.name)} standings</caption>
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Team</th>
          <th scope="col" class="num">P</th>
          <th scope="col" class="num">W</th>
          <th scope="col" class="num">D</th>
          <th scope="col" class="num">L</th>
          <th scope="col" class="num">GF</th>
          <th scope="col" class="num">GA</th>
          <th scope="col" class="num">GD</th>
          <th scope="col" class="num">Pts</th>
          <th scope="col">Form</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `<tr>
          <td><span class="position-badge ${row.position <= 4 ? "top" : row.position >= rows.length - 1 ? "bottom" : ""}">${row.position}</span></td>
          <td><a class="team-cell" href="${Matchday.url.team(row.team.id)}">${Matchday.crest(row.team, "xs")}<span>${Matchday.esc(row.team.name)}</span></a></td>
          <td class="num">${row.played}</td>
          <td class="num">${row.won}</td>
          <td class="num">${row.drawn}</td>
          <td class="num">${row.lost}</td>
          <td class="num">${row.goalsFor}</td>
          <td class="num">${row.goalsAgainst}</td>
          <td class="num">${row.goalDifference > 0 ? "+" : ""}${row.goalDifference}</td>
          <td class="num"><strong>${row.points}</strong></td>
          <td>${Matchday.formDots(row.form)}</td>
        </tr>`).join("")}
      </tbody>
    </table>
  </div>
  <div class="table-foot">
    <span class="small muted">${played} matches played · top four highlighted · bottom two in the relegation zone.</span>
    <span class="small muted">Form: most recent last.</span>
  </div>`;
}

function renderDetail() {
  const league = Store.league(currentLeague);
  if (!league) {
    detailRoot.innerHTML = Matchday.emptyState({
      iconName: "trophy", title: "League not found",
      text: "Pick a competition from the list on the left.",
      ctaLabel: "Matches hub", ctaHref: Matchday.url.matches,
    });
    return;
  }

  const fixtures = Store.leagueFixtures(league.id);
  const finished = fixtures.filter((m) => m.status === "finished")
    .sort((a, b) => b.kickoffDate - a.kickoffDate);
  const upcoming = fixtures.filter((m) => m.status !== "finished")
    .sort((a, b) => a.kickoffDate - b.kickoffDate);
  const goals = finished.reduce((sum, m) => sum + m.score.home + m.score.away, 0);
  const avg = finished.length ? (goals / finished.length).toFixed(1) : "0.0";
  const teams = Store.teamsInLeague(league.id);
  const ink = Matchday.inkFor(league.accent);
  document.title = `${league.name} · Matchday`;

  detailRoot.innerHTML = `
    <section class="league-hero" style="--league-1:${league.color};--league-2:${league.accent}" aria-label="${Matchday.esc(league.name)} overview">
      <div class="league-hero-top">
        <span class="league-badge" style="--league-ink:${ink}">${Matchday.esc(league.short)}</span>
        <div>
          <h1>${Matchday.esc(league.name)}</h1>
          <p class="league-country">${Matchday.esc(league.country)} · Season ${Matchday.esc(league.season)} · ${teams.length} clubs</p>
        </div>
      </div>
      <p>${Matchday.esc(league.description)}</p>
      <div class="hero-stats">
        <div class="hero-stat"><strong>${teams.length}</strong><span>Clubs</span></div>
        <div class="hero-stat"><strong>${finished.length}</strong><span>Matches played</span></div>
        <div class="hero-stat"><strong>${goals}</strong><span>Goals scored</span></div>
        <div class="hero-stat"><strong>${avg}</strong><span>Goals per match</span></div>
      </div>
    </section>

    <div class="tabs" data-tabs="#league-panels" role="tablist" aria-label="League information">
      <button class="tab is-active" type="button" role="tab" data-tab="fixtures" aria-selected="true">Fixtures &amp; results</button>
      <button class="tab" type="button" role="tab" data-tab="standings" aria-selected="false">Standings</button>
    </div>

    <div id="league-panels">
      <div class="tab-panel" data-panel="fixtures">
        <div class="league-columns">
          ${fixturePanel("Next fixtures", `${upcoming.length} fixture${upcoming.length === 1 ? "" : "s"}`, upcoming.slice(0, 5), "calendar")}
          ${fixturePanel("Latest results", "Last five", finished.slice(0, 5), "activity")}
        </div>
        <div class="league-columns" style="margin-top:18px;">
          ${scorersPanel(league, 5)}
          <section class="panel" aria-label="League snapshot">
            <div class="panel-head"><h3>Season snapshot</h3><span class="panel-sub">${Matchday.esc(league.season)}</span></div>
            <dl class="info-list">
              <div class="info-row"><dt>League</dt><dd>${Matchday.esc(league.name)}</dd></div>
              <div class="info-row"><dt>Country</dt><dd>${Matchday.esc(league.country)}</dd></div>
              <div class="info-row"><dt>Founded</dt><dd>${league.founded || "—"}</dd></div>
              <div class="info-row"><dt>Clubs</dt><dd>${teams.length}</dd></div>
              <div class="info-row"><dt>Matchweeks</dt><dd>${Math.max(...fixtures.map((m) => m.round || 0))}</dd></div>
              <div class="info-row"><dt>Fixtures in data</dt><dd>${fixtures.length}</dd></div>
              <div class="info-row"><dt>Top scorer</dt><dd>${topScorerLine(league)}</dd></div>
            </dl>
          </section>
        </div>
      </div>

      <div class="tab-panel" data-panel="standings" hidden>
        <div class="league-columns standings-layout">
          <div>
            ${standingsPanel(league)}
          </div>
          <div>
            ${scorersPanel(league, 5)}
            <section class="panel" style="margin-top:18px;" aria-label="Table key">
              <div class="panel-head"><h3>Table key</h3></div>
              <dl class="info-list">
                <div class="info-row"><dt><span class="position-badge top">1</span></dt><dd>Top four</dd></div>
                <div class="info-row"><dt><span class="position-badge bottom">8</span></dt><dd>Bottom two</dd></div>
                <div class="info-row"><dt>P</dt><dd>Played</dd></div>
                <div class="info-row"><dt>GD</dt><dd>Goal difference</dd></div>
                <div class="info-row"><dt>Pts</dt><dd>Points (3 for a win)</dd></div>
              </dl>
            </section>
          </div>
        </div>
      </div>
    </div>`;

  Matchday.setupTabs(detailRoot);
}

function topScorerLine(league) {
  const chart = Store.scoringChart(league.id, 1);
  if (!chart.length) return "—";
  const { player, stats } = chart[0];
  return `<a class="link" href="${Matchday.url.player(player.id)}">${Matchday.esc(player.name)}</a> (${stats.goals})`;
}

function selectLeague(id) {
  currentLeague = String(id);
  Matchday.setParams({ league: currentLeague });
  renderLeagueList();
  renderDetail();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

listRoot.addEventListener("click", (event) => {
  const link = event.target.closest("[data-league]");
  if (!link) return;
  event.preventDefault();
  selectLeague(link.dataset.league);
});

document.addEventListener("matchday:reminders", () => {
  // Reminder buttons update through the shared handler; nothing else to do here.
});

renderLeagueList();
renderDetail();
