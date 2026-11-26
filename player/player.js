/* ============================================================
   player.js - Page 6, Player Profile.
   Season totals, a rating trend, recent match performances that
   link back to Match Detail, player details and a compare box.
   ============================================================ */
const playerRoot = document.getElementById("player-root");
const playerId = Matchday.param("id");
const player = playerId ? Store.player(playerId) : null;

if (!player) {
  playerRoot.innerHTML = Matchday.emptyState({
    iconName: "users",
    title: playerId ? "Player not found" : "Choose a player",
    text: "Open a player from the Players table, a squad list or a match line-up to see their season profile.",
    ctaLabel: "Browse players",
    ctaHref: Matchday.url.players,
  });
} else {
  document.title = `${player.name} · Matchday`;
  renderPlayer(player);
}

function ordinal(number) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

function compareHref(player) {
  let partner = null;
  try {
    const saved = JSON.parse(sessionStorage.getItem("matchday.compare") || "[]");
    partner = saved.map((id) => Store.player(id)).find((candidate) => candidate && candidate.id !== player.id);
  } catch (e) { /* ignore */ }
  return partner ? Matchday.url.compare(player.id, partner.id) : Matchday.url.compare(player.id);
}

function renderPlayer(player) {
  const stats = Store.playerSeason(player.id);
  const appearances = Store.playerAppearances(player.id);
  const table = Store.standings(player.leagueId);
  const position = table.find((row) => row.team.id === player.team.id);
  const next = Store.nextFixture(player.team.id);
  const team = player.team;
  const league = player.league;
  const partnerLabel = comparePartnerLabel(player);
  const recent = appearances.slice(0, 10);
  const trend = appearances.slice(0, 8).reverse();
  const goalsPer90 = stats.minutes ? ((stats.goals / stats.minutes) * 90).toFixed(2) : "0.00";

  playerRoot.innerHTML = `
    <section class="player-hero" style="--team-1:${team.colors[0]};--team-2:${team.colors[1]}" aria-label="${Matchday.esc(player.name)} profile">
      ${Matchday.avatar(player, "xl")}
      <div class="player-hero-copy">
        <span class="eyebrow">#${player.number} · ${player.position} · ${Matchday.esc(player.nationality)}</span>
        <h1>${Matchday.esc(player.name)}</h1>
        <p class="player-sub">
          <a href="${Matchday.url.team(team.id)}">${Matchday.esc(team.name)}</a>
          <span class="sep">·</span>
          <a href="${Matchday.url.league(league.id)}?league=${league.id}">${Matchday.esc(league.name)}</a>
          <span class="sep">·</span>
          <span>${player.age} years</span>
        </p>
        <div class="player-hero-meta">
          <span>${Matchday.icon("activity")}${stats.played} app${stats.played === 1 ? "" : "s"} · ${stats.goals} goal${stats.goals === 1 ? "" : "s"} · ${stats.assists} assist${stats.assists === 1 ? "" : "s"}</span>
          <span>${Matchday.icon("clock")}${stats.minutes.toLocaleString()} minutes</span>
          <span>${Matchday.icon("star")}${stats.avgRating ? `${stats.avgRating.toFixed(1)} avg rating` : "No rating yet"}</span>
        </div>
        <div class="player-hero-actions">
          <a class="btn btn-sm btn-gold" href="${compareHref(player)}">${Matchday.icon("swap")} ${partnerLabel || "Compare with another player"}</a>
          <a class="btn btn-sm btn-outline" href="${Matchday.url.team(team.id)}">${Matchday.icon("shield")} Team page</a>
          <a class="btn btn-sm btn-outline" href="${Matchday.url.players}?team=${team.id}">${Matchday.icon("users")} Squad list</a>
          <button class="btn btn-sm btn-ghost" type="button" data-copy="${Matchday.esc(playerShareUrl(player))}">${Matchday.icon("copy")} Copy link</button>
        </div>
      </div>
    </section>

    <section class="season-grid" aria-label="Season totals">
      <div class="stat-card"><div class="stat-label">Appearances</div><div class="stat-value">${stats.played}</div><div class="stat-sub">${stats.started} start${stats.started === 1 ? "" : "s"}</div></div>
      <div class="stat-card"><div class="stat-label">Minutes</div><div class="stat-value">${stats.minutes.toLocaleString()}</div><div class="stat-sub">${stats.played ? Math.round(stats.minutes / stats.played) : 0} per match</div></div>
      <div class="stat-card"><div class="stat-label">Goals</div><div class="stat-value">${stats.goals}</div><div class="stat-sub">${goalsPer90} per 90</div></div>
      <div class="stat-card"><div class="stat-label">Assists</div><div class="stat-value">${stats.assists}</div><div class="stat-sub">${stats.goals + stats.assists} involvements</div></div>
      <div class="stat-card"><div class="stat-label">Avg rating</div><div class="stat-value">${stats.avgRating ? stats.avgRating.toFixed(1) : "—"}</div><div class="stat-sub">out of 10</div></div>
    </section>

    <div class="player-layout">
      <div class="player-main">
        <section class="panel" aria-label="Recent matches">
          <div class="panel-head">
            <h3>Recent matches</h3>
            <a class="panel-sub" href="${Matchday.url.players}?team=${team.id}">Full squad</a>
          </div>
          ${recent.length ? recentTable(player, recent) : `<p class="empty">No appearances recorded yet this season.</p>`}
        </section>

        <section class="panel" aria-label="Rating trend">
          <div class="panel-head"><h3>Rating trend</h3><span class="panel-sub">Last ${trend.length} appearances</span></div>
          ${trend.length ? `<div class="form-chart" role="img" aria-label="Match ratings for the last ${trend.length} appearances">
            ${trend.map((appearance) => {
              const height = Math.max(6, Math.min(100, ((appearance.rating - 5) / 4.5) * 100));
              const opponent = Store.team(appearance.opponentId);
              return `<div class="form-bar ${appearance.rating >= 7.4 ? "high" : appearance.rating < 6.5 ? "low" : ""}" title="${Matchday.esc(opponent ? opponent.name : "")} · ${appearance.rating.toFixed(1)}">
                <span style="height:${height}%"></span><small>${Matchday.esc(opponent ? opponent.short : "")}</small>
              </div>`;
            }).join("")}
          </div>
          <p class="form-chart-caption">Each bar is one match rating, oldest to newest. Hover a bar for the opponent and score.</p>`
            : `<p class="empty">No ratings yet.</p>`}
        </section>
      </div>

      <aside class="player-side">
        <section class="panel" aria-label="Player details">
          <div class="panel-head"><h3>Player details</h3><span class="panel-sub">#${player.number}</span></div>
          <dl class="info-list">
            <div class="info-row"><dt>Position</dt><dd>${Matchday.esc(player.position)}</dd></div>
            <div class="info-row"><dt>Team</dt><dd><a class="link" href="${Matchday.url.team(team.id)}">${Matchday.esc(team.name)}</a></dd></div>
            <div class="info-row"><dt>League</dt><dd>${Matchday.esc(league.name)}</dd></div>
            <div class="info-row"><dt>Nationality</dt><dd>${Matchday.esc(player.nationality)}</dd></div>
            <div class="info-row"><dt>Age</dt><dd>${player.age}</dd></div>
            <div class="info-row"><dt>Height</dt><dd>${player.height} cm</dd></div>
            <div class="info-row"><dt>Preferred foot</dt><dd>${player.foot}</dd></div>
            <div class="info-row"><dt>Joined</dt><dd>${player.joined}</dd></div>
            ${position ? `<div class="info-row"><dt>League position</dt><dd>${position.position}${ordinal(position.position)} · ${position.points} pts</dd></div>` : ""}
          </dl>
          <p class="player-bio">${player.foot}-footed ${player.position.toLowerCase()} ${player.age < 24 ? "at the start of his career" : player.age < 30 ? "in his prime" : "in the latter stages of his career"}, part of ${Matchday.esc(team.name)}'s ${player.squadRole === "XI" ? "starting eleven" : player.squadRole === "SUB" ? "rotation" : "squad"}.</p>
          <div class="badge-row">${player.traits.map((trait) => `<span class="tag">${Matchday.esc(trait)}</span>`).join("")}</div>
        </section>

        ${next ? `<section class="panel" aria-label="Next team fixture">
          <div class="panel-head"><h3>Next for ${Matchday.esc(team.short)}</h3><span class="panel-sub">${Matchday.roundLabel(next)}</span></div>
          <div class="fixture-list">${Matchday.fixtureRow(next, { remind: true })}</div>
          <a class="btn btn-sm btn-ghost" style="margin-top:8px;" href="${Matchday.url.team(team.id)}">Team fixtures ${Matchday.icon("arrowRight")}</a>
        </section>` : ""}

        <section class="panel" aria-label="Compare with another player">
          <div class="panel-head"><h3>Compare players</h3></div>
          <p class="side-note" style="margin-top:0;margin-bottom:10px;">Pick any other player to see their season stats side by side with ${Matchday.esc(player.name)}.</p>
          <div class="compare-pick">
            <label class="sr-only" for="compare-choose">Choose a player</label>
            <select class="select" id="compare-choose">
              <option value="">Choose a player…</option>
              ${playerOptions(player)}
            </select>
            <button class="btn btn-primary" type="button" id="compare-pick-go" disabled>Compare</button>
          </div>
        </section>

        <section class="panel" aria-label="Form summary">
          <div class="panel-head"><h3>Season form</h3></div>
          <dl class="info-list">
            <div class="info-row"><dt>Wins</dt><dd>${stats.wins}</dd></div>
            <div class="info-row"><dt>Draws</dt><dd>${stats.draws}</dd></div>
            <div class="info-row"><dt>Losses</dt><dd>${stats.losses}</dd></div>
            <div class="info-row"><dt>Clean sheets</dt><dd>${stats.cleanSheets}</dd></div>
            <div class="info-row"><dt>Goal involvements</dt><dd>${stats.goals + stats.assists}</dd></div>
          </dl>
        </section>
      </aside>
    </div>`;

  wireComparePicker(player);
}

function playerShareUrl(player) {
  return `${location.href.split("?")[0]}?id=${player.id}`;
}

function comparePartnerLabel(player) {
  try {
    const saved = JSON.parse(sessionStorage.getItem("matchday.compare") || "[]");
    const partner = saved.map((id) => Store.player(id)).find((candidate) => candidate && candidate.id !== player.id);
    return partner ? `Compare with ${partner.name.split(" ")[0]}` : "";
  } catch (e) {
    return "";
  }
}

function recentTable(player, appearances) {
  return `<div class="table-wrap table-plain">
    <table class="data-table profile-table">
      <thead>
        <tr>
          <th scope="col">Match</th>
          <th scope="col">Result</th>
          <th scope="col" class="num">Score</th>
          <th scope="col" class="num">Min</th>
          <th scope="col" class="num">G</th>
          <th scope="col" class="num">A</th>
          <th scope="col" class="num">Rating</th>
          <th scope="col"><span class="sr-only">View</span></th>
        </tr>
      </thead>
      <tbody>
        ${appearances.map((appearance) => {
          const opponent = Store.team(appearance.opponentId);
          const atHome = appearance.match.home.id === player.teamId;
          return `<tr>
            <td>
              <a class="table-player" href="${Matchday.url.match(appearance.match.id)}">
                ${Matchday.crest(opponent, "xs")}
                <span><span class="player-name">${atHome ? "vs" : "at"} ${Matchday.esc(opponent.name)}</span>
                <span class="player-meta">${Matchday.fmtDate(appearance.match.kickoff)} · ${appearance.match.status === "live" ? "Live" : "Full time"}</span></span>
              </a>
            </td>
            <td><span class="result-pill ${appearance.result}">${appearance.result}</span></td>
            <td class="num">${appearance.goalsFor}–${appearance.goalsAgainst}</td>
            <td class="num">${appearance.minutes}'</td>
            <td class="num">${appearance.goals}</td>
            <td class="num">${appearance.assists}</td>
            <td class="num"><span class="rating ${Matchday.ratingClass(appearance.rating)}">${appearance.rating.toFixed(1)}</span></td>
            <td><a class="table-team" href="${Matchday.url.match(appearance.match.id)}" aria-label="View match">${Matchday.icon("chevronRight")}</a></td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>`;
}

function playerOptions(player) {
  return Store.leagues.map((league) => {
    const teams = Store.teamsInLeague(league.id).slice().sort((a, b) => a.name.localeCompare(b.name));
    return `<optgroup label="${Matchday.esc(league.name)}">${teams.map((team) => {
      const squad = Store.squad(team.id)
        .filter((candidate) => candidate.id !== player.id)
        .map((candidate) => `<option value="${candidate.id}">${Matchday.esc(candidate.name)} (${Matchday.esc(team.short)})</option>`)
        .join("");
      return squad;
    }).join("")}</optgroup>`;
  }).join("");
}

function wireComparePicker(player) {
  const select = document.getElementById("compare-choose");
  const button = document.getElementById("compare-pick-go");
  if (!select || !button) return;
  select.addEventListener("change", () => {
    button.disabled = !select.value;
  });
  button.addEventListener("click", () => {
    if (!select.value) return;
    window.location.href = Matchday.url.compare(player.id, select.value);
  });
}
