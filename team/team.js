/* ============================================================
   team.js - Page 4, Team Page.
   Club header, next fixture with reminder, recent results,
   league position, top scorers and a full squad table that
   links to every player profile.
   ============================================================ */
const teamRoot = document.getElementById("team-root");
const teamId = Matchday.param("id");
const team = teamId ? Store.team(teamId) : null;

if (!team) {
  teamRoot.innerHTML = Matchday.emptyState({
    iconName: "shield",
    title: teamId ? "Team not found" : "Choose a club",
    text: "Open a club from a match card, a league table or the squad list to see its page.",
    ctaLabel: "Browse leagues",
    ctaHref: Matchday.url.leagues,
  });
} else {
  document.title = `${team.name} · Matchday`;
  renderTeam(team);
}

function ordinal(number) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

function renderTeam(team) {
  const standing = Store.teamStanding(team.id);
  const next = Store.nextFixture(team.id);
  const recent = Store.recentResults(team.id, 5);
  const league = team.league;
  const squad = Store.squad(team.id);
  const allMatches = Store.teamMatches(team.id);
  const upcoming = allMatches.filter((m) => m.status !== "finished");
  const results = allMatches.filter((m) => m.status === "finished").slice().reverse();
  const scorers = Store.teamSummary(team)?.scorers || [];
  const avgAge = squad.length
    ? Math.round((squad.reduce((sum, p) => sum + p.age, 0) / squad.length) * 10) / 10
    : 0;
  const nextIsLive = next && next.status === "live";

  teamRoot.innerHTML = `
    <section class="team-hero" style="--team-1:${team.colors[0]};--team-2:${team.colors[1]}" aria-label="${Matchday.esc(team.name)} club header">
      ${Matchday.crest(team, "xl")}
      <div class="team-hero-copy">
        <span class="eyebrow">${Matchday.esc(league.name)} · ${Matchday.esc(team.country)}</span>
        <h1>${Matchday.esc(team.name)}</h1>
        <p class="team-tagline">${Matchday.esc(team.nickname)} · ${Matchday.esc(team.city)}</p>
        <div class="team-hero-meta">
          <span>${Matchday.icon("pin")}${Matchday.esc(team.stadium)}</span>
          <span>${Matchday.icon("users")}${team.capacity.toLocaleString()} capacity</span>
          <span>${Matchday.icon("calendar")}Founded ${team.founded}</span>
          ${standing ? `<span>${Matchday.icon("trophy")}${standing.position}${ordinal(standing.position)} · ${standing.points} pts</span>` : ""}
        </div>
        <div class="team-hero-actions">
          ${next && next.status === "upcoming" ? Matchday.remindButton(next, { on: "Reminder set", off: "Set reminder" }) : ""}
          ${nextIsLive ? `<a class="btn btn-sm btn-gold" href="${Matchday.url.match(next.id)}">${Matchday.icon("activity")} Live now</a>` : ""}
          <a class="btn btn-sm btn-outline" href="${Matchday.url.league(league.id)}?league=${league.id}">${Matchday.icon("trophy")} League table</a>
          <a class="btn btn-sm btn-outline" href="${Matchday.url.players}?team=${team.id}">${Matchday.icon("users")} All players</a>
        </div>
      </div>
    </section>

    <section class="team-summary" aria-label="Season summary">
      <div class="stat-card">
        <div class="stat-label">League position</div>
        <div class="stat-value">${standing ? `${standing.position}${ordinal(standing.position)}` : "—"}</div>
        <div class="stat-sub">${Matchday.esc(league.name)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Points</div>
        <div class="stat-value">${standing ? standing.points : "—"}</div>
        <div class="stat-sub">${standing ? `${standing.played} played · ${standing.won}W ${standing.drawn}D ${standing.lost}L` : "No matches yet"}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Goals scored</div>
        <div class="stat-value">${standing ? standing.goalsFor : "—"}</div>
        <div class="stat-sub">${standing ? `Conceded ${standing.goalsAgainst} · GD ${standing.goalDifference > 0 ? "+" : ""}${standing.goalDifference}` : ""}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Next fixture</div>
        <div class="stat-value">${next ? (next.status === "live" ? "Live" : Matchday.dayLabel(next.kickoff)) : "—"}</div>
        <div class="stat-sub">${next ? `vs ${Matchday.esc(next.home.id === team.id ? next.away.name : next.home.name)} · ${Matchday.fmtTime(next.kickoff)}` : "Season complete"}</div>
      </div>
    </section>

    <div class="tabs" data-tabs="#team-panels" role="tablist" aria-label="Team information">
      <button class="tab is-active" type="button" role="tab" data-tab="overview" aria-selected="true">Overview</button>
      <button class="tab" type="button" role="tab" data-tab="squad" aria-selected="false">Squad <span class="count">${squad.length}</span></button>
      <button class="tab" type="button" role="tab" data-tab="fixtures" aria-selected="false">Fixtures <span class="count">${allMatches.length}</span></button>
    </div>

    <div id="team-panels">
      <div class="tab-panel" data-panel="overview">
        <div class="team-layout">
          <div class="team-main">
            <section class="panel" aria-label="Next fixture">
              <div class="panel-head"><h3>Next fixture</h3><span class="panel-sub">${next ? Matchday.roundLabel(next) : "No fixture"}</span></div>
              ${next ? nextFixture(next, team) : `<p class="empty">No upcoming fixtures for this club.</p>`}
            </section>
            <section class="panel" aria-label="Recent results">
              <div class="panel-head"><h3>Recent results</h3><span class="panel-sub">Last five</span></div>
              ${recent.length
                ? `<div class="fixture-list">${recent.map((match) => Matchday.fixtureRow(match)).join("")}</div>`
                : `<p class="empty">No results yet.</p>`}
            </section>
          </div>
          <aside class="team-side">
            ${leagueTablePanel(team)}
            ${topScorersPanel(team, scorers)}
            ${clubInfoPanel(team)}
          </aside>
        </div>
      </div>

      <div class="tab-panel" data-panel="squad" hidden>
        <div class="team-layout">
          <div class="team-main">
            <section class="panel" aria-label="Squad list">
              <div class="panel-head">
                <h3>Squad</h3>
                <span class="panel-sub">${squad.length} players · average age ${avgAge}</span>
              </div>
              ${squadTable(team, squad)}
            </section>
          </div>
          <aside class="team-side">
            ${teamLeadersPanel(team)}
            ${leagueTablePanel(team)}
          </aside>
        </div>
      </div>

      <div class="tab-panel" data-panel="fixtures" hidden>
        <div class="league-columns">
          <section class="panel" aria-label="Upcoming fixtures">
            <div class="panel-head"><h3>Upcoming</h3><span class="panel-sub">${upcoming.length} fixtures</span></div>
            ${upcoming.length
              ? `<div class="fixture-list">${upcoming.map((match) => Matchday.fixtureRow(match, { remind: true })).join("")}</div>`
              : `<p class="empty">No upcoming fixtures.</p>`}
          </section>
          <section class="panel" aria-label="Results">
            <div class="panel-head"><h3>Results</h3><span class="panel-sub">${results.length} matches</span></div>
            ${results.length
              ? `<div class="fixture-list">${results.map((match) => Matchday.fixtureRow(match)).join("")}</div>`
              : `<p class="empty">No results yet.</p>`}
          </section>
        </div>
      </div>
    </div>`;

  Matchday.setupTabs(teamRoot);
}

function shareMatchUrl(match) {
  const base = location.href.split("?")[0].replace(/team\/index\.html$/, "");
  return `${base}match/index.html?id=${match.id}`;
}

function nextFixture(match, team) {
  const opponent = match.home.id === team.id ? match.awayTeam : match.homeTeam;
  const isHome = match.home.id === team.id;
  return `<div class="next-fixture">
    <div class="nf-head">
      <span class="badge ${match.status === "live" ? "badge-live" : "badge-soon"}">
        ${match.status === "live" ? '<span class="live-dot"></span>Live now' : `${Matchday.icon("clock")}Kick-off in <span data-countdown="${match.kickoff}">${Matchday.formatCountdown(match.kickoff)}</span>`}
      </span>
      <span class="muted small">${Matchday.esc(Matchday.fmtDateLong(match.kickoff))} · ${Matchday.fmtTime(match.kickoff)}</span>
    </div>
    <div class="nf-teams">
      <a class="nf-team" href="${Matchday.url.team(team.id)}">
        ${Matchday.crest(team, "md")}
        <span><strong>${Matchday.esc(team.name)}</strong><small>${isHome ? "Home" : "Away"}</small></span>
      </a>
      <span class="nf-vs">v</span>
      <a class="nf-team away" href="${Matchday.url.team(opponent.id)}">
        <span><strong>${Matchday.esc(opponent.name)}</strong><small>${isHome ? "Away" : "Home"}</small></span>
        ${Matchday.crest(opponent, "md")}
      </a>
    </div>
    ${match.status === "live" || match.status === "finished" ? `<div class="nf-score">${match.score ? `${match.score.home} – ${match.score.away}` : ""} ${Matchday.statusBadge(match)}</div>` : ""}
    <div class="nf-meta">${Matchday.icon("pin")}${Matchday.esc(match.venue)} · ${Matchday.esc(match.league.name)}</div>
    <div class="nf-actions">
      ${match.status === "upcoming" ? Matchday.remindButton(match, { on: "Reminder set", off: "Set reminder" }) : ""}
      <a class="btn btn-sm btn-primary" href="${Matchday.url.match(match.id)}">Match centre ${Matchday.icon("arrowRight")}</a>
      ${match.status === "upcoming" ? `<button class="btn btn-sm btn-ghost" type="button" data-copy="${Matchday.esc(shareMatchUrl(match))}">${Matchday.icon("copy")} Copy match link</button>` : ""}
    </div>
  </div>`;
}

function squadTable(team, squad) {
  const groups = [
    ["Goalkeepers", "GK"],
    ["Defenders", "DEF"],
    ["Midfielders", "MID"],
    ["Forwards", "FWD"],
  ];
  const rows = groups.map(([label, code]) => {
    const group = squad.filter((player) => player.positionCode === code);
    if (!group.length) return "";
    return `<tr class="group-row"><td colspan="7">${label}</td></tr>`
      + group.map((player) => {
        const stats = Store.playerSeason(player.id);
        return `<tr>
          <td class="squad-number">${player.number}</td>
          <td>
            <a class="table-player" href="${Matchday.url.player(player.id)}">
              ${Matchday.avatar(player, "xs")}
              <span><span class="player-name">${Matchday.esc(player.name)}</span>
              <span class="player-meta">${Matchday.esc(player.nationality)} · ${player.age} years</span></span>
            </a>
          </td>
          <td><span class="tag">${player.positionCode}</span></td>
          <td class="num">${stats.played}</td>
          <td class="num">${stats.goals}</td>
          <td class="num">${stats.assists}</td>
          <td class="num"><span class="rating ${Matchday.ratingClass(stats.avgRating)}">${stats.avgRating ? stats.avgRating.toFixed(1) : "—"}</span></td>
        </tr>`;
      }).join("");
  }).join("");

  return `<div class="table-wrap table-plain">
    <table class="data-table squad-table">
      <thead>
        <tr>
          <th scope="col" class="num">#</th>
          <th scope="col">Player</th>
          <th scope="col">Pos</th>
          <th scope="col" class="num">Apps</th>
          <th scope="col" class="num">G</th>
          <th scope="col" class="num">A</th>
          <th scope="col" class="num">Rating</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function leagueTablePanel(team) {
  const table = Store.standings(team.leagueId);
  return `<section class="panel" aria-label="League position">
    <div class="panel-head">
      <h3>League position</h3>
      <a class="panel-sub" href="${Matchday.url.league(team.leagueId)}?league=${team.leagueId}">Full table</a>
    </div>
    <div class="table-wrap table-plain">
      <table class="data-table standings-mini">
        <thead><tr><th>#</th><th>Team</th><th class="num">P</th><th class="num">Pts</th></tr></thead>
        <tbody>
          ${table.map((row) => `<tr class="${row.team.id === team.id ? "is-current" : ""}">
            <td><span class="position-badge ${row.position <= 4 ? "top" : ""}">${row.position}</span></td>
            <td><a class="team-cell" href="${Matchday.url.team(row.team.id)}">${Matchday.crest(row.team, "xs")}<span>${Matchday.esc(row.team.short)}</span></a></td>
            <td class="num">${row.played}</td>
            <td class="num"><strong>${row.points}</strong></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="side-note">Highlighted row is ${Matchday.esc(team.name)}. Full form and goal difference on the league page.</p>
  </section>`;
}

function topScorersPanel(team, scorers) {
  return `<section class="panel" aria-label="Top scorers">
    <div class="panel-head">
      <h3>Top scorers</h3>
      <a class="panel-sub" href="${Matchday.url.players}?team=${team.id}&sort=goals">Squad stats</a>
    </div>
    ${scorers.length
      ? `<ul class="side-list">${scorers.map(({ player, stats }, index) => `<li>
          <a href="${Matchday.url.player(player.id)}">
            <span class="position-badge ${index === 0 ? "top" : ""}">${index + 1}</span>
            ${Matchday.avatar(player, "xs")}
            <span>${Matchday.esc(player.name)}<br><small>${player.position} · ${stats.played} app${stats.played === 1 ? "" : "s"}</small></span>
            <span class="count">${stats.goals}</span>
          </a>
        </li>`).join("")}</ul>`
      : `<p class="empty">No goals scored yet.</p>`}
  </section>`;
}

function clubInfoPanel(team) {
  return `<section class="panel" aria-label="Club information">
    <div class="panel-head"><h3>Club information</h3></div>
    <dl class="info-list">
      <div class="info-row"><dt>Nickname</dt><dd>${Matchday.esc(team.nickname)}</dd></div>
      <div class="info-row"><dt>Country</dt><dd>${Matchday.esc(team.country)}</dd></div>
      <div class="info-row"><dt>City</dt><dd>${Matchday.esc(team.city)}</dd></div>
      <div class="info-row"><dt>Stadium</dt><dd>${Matchday.esc(team.stadium)}</dd></div>
      <div class="info-row"><dt>Capacity</dt><dd>${team.capacity.toLocaleString()}</dd></div>
      <div class="info-row"><dt>Founded</dt><dd>${team.founded}</dd></div>
      <div class="info-row"><dt>Colours</dt><dd class="colour-row"><span class="colour-dot" style="background:${team.colors[0]}"></span><span class="colour-dot" style="background:${team.colors[1]}"></span>${Matchday.esc(team.colors[0])} / ${Matchday.esc(team.colors[1])}</dd></div>
    </dl>
  </section>`;
}

function teamLeadersPanel(team) {
  const squad = Store.squad(team.id)
    .map((player) => ({ player, stats: Store.playerSeason(player.id) }))
    .filter((row) => row.stats.played > 0);
  const topScorer = squad.slice().sort((a, b) => b.stats.goals - a.stats.goals)[0];
  const mostApps = squad.slice().sort((a, b) => b.stats.played - a.stats.played)[0];
  const bestRating = squad.slice()
    .filter((row) => row.stats.played >= 4)
    .sort((a, b) => b.stats.avgRating - a.stats.avgRating)[0];
  const row = (label, entry, value) => entry
    ? `<div class="info-row"><dt>${label}</dt><dd><a class="link" href="${Matchday.url.player(entry.player.id)}">${Matchday.esc(entry.player.name)}</a> <span class="muted">${value}</span></dd></div>`
    : "";
  return `<section class="panel" aria-label="Squad leaders">
    <div class="panel-head"><h3>Squad leaders</h3><span class="panel-sub">Season totals</span></div>
    <dl class="info-list">
      ${row("Top scorer", topScorer, topScorer ? `${topScorer.stats.goals} goals` : "")}
      ${row("Most appearances", mostApps, mostApps ? `${mostApps.stats.played} apps` : "")}
      ${row("Best rating", bestRating, bestRating ? `${bestRating.stats.avgRating.toFixed(1)} avg` : "")}
    </dl>
    <p class="side-note">Only players with at least four appearances are ranked for rating.</p>
  </section>`;
}
