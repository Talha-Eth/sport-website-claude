/* ============================================================
   match.js - Page 2, Match Detail.
   A scoreboard with the live/final score, Summary and Player
   stats tabs, a key-events timeline and a reminder button for
   upcoming matches.
   ============================================================ */
const root = document.getElementById("match-root");
const matchId = Matchday.param("id");
const match = matchId ? Store.match(matchId) : null;

if (!match) {
  root.innerHTML = `
    <div class="empty-state" style="margin-top:12px;">
      <div class="empty-icon">${Matchday.icon("ball")}</div>
      <h3>${matchId ? "Match not found" : "Choose a match"}</h3>
      <p>${matchId ? "That match is not in the fixture list. It may have been replaced by a newer one." : "Open any match card from the hub to see the scoreboard, key events and player stats."}</p>
      <a class="btn btn-primary" href="../index.html">Browse all matches</a>
    </div>`;
} else {
  document.title = `${match.home.name} v ${match.away.name} · Matchday`;
  renderMatch(match);
}

function calendarLink(match) {
  const start = new Date(match.kickoff);
  const end = new Date(start.getTime() + 120 * 60000);
  const stamp = (date) => `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
  const text = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Matchday//EN", "BEGIN:VEVENT",
    `UID:${match.id}@matchday.local`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${match.home.name} vs ${match.away.name}`,
    `LOCATION:${match.venue}, ${match.city}`,
    `DESCRIPTION:${match.league.name} - Matchweek ${match.round}. Kick-off ${Matchday.fmtDateTime(match.kickoff)}.`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(text)}`;
}

function teamBlock(team, side) {
  const standing = Store.teamStanding(team.id);
  return `<div class="sb-team">
    <a href="${Matchday.url.team(team.id)}" aria-label="${Matchday.esc(team.name)} team page">${Matchday.crest(team, "lg")}</a>
    <div>
      <h2><a href="${Matchday.url.team(team.id)}">${Matchday.esc(team.name)}</a></h2>
      <p class="meta">${standing ? `${standing.position}${ordinal(standing.position)} · ${standing.points} pts` : ""}</p>
    </div>
  </div>`;
}

function ordinal(number) {
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return "st";
  if (mod10 === 2 && mod100 !== 12) return "nd";
  if (mod10 === 3 && mod100 !== 13) return "rd";
  return "th";
}

function scoreCentre() {
  if (match.status === "upcoming") {
    return `<div class="sb-score">
      <div class="kickoff-time">${Matchday.fmtTime(match.kickoff)}</div>
      <div class="kickoff-date">${Matchday.fmtDateLong(match.kickoff)}</div>
      <div class="status"><span class="badge badge-soon">${Matchday.icon("clock")}Kick-off in <span data-countdown="${match.kickoff}">${Matchday.formatCountdown(match.kickoff)}</span></span></div>
    </div>`;
  }
  return `<div class="sb-score">
    <div class="numbers">${match.score.home}<span class="sep">–</span>${match.score.away}</div>
    <div class="status">${Matchday.statusBadge(match)}</div>
  </div>`;
}

function renderMatch(match) {
  const stats = Store.matchStats(match.id);
  const statsCount = stats.home.length + stats.away.length;
  const isUpcoming = match.status === "upcoming";
  const events = enrichEvents(match);

  root.innerHTML = `
    <h1 class="sr-only">${Matchday.esc(match.home.name)} versus ${Matchday.esc(match.away.name)} match centre</h1>
    <section class="scoreboard ${match.status === "live" ? "is-live" : ""}" aria-label="Match scoreboard">
      <div class="sb-top">
        <span class="sb-meta">
          <span>${Matchday.icon("trophy")}<a class="link" href="${Matchday.url.league(match.leagueId)}?league=${match.leagueId}">${Matchday.esc(match.league.name)}</a></span>
          <span>${Matchday.icon("calendar")}${Matchday.esc(Matchday.fmtDateLong(match.kickoff))}</span>
          <span>${Matchday.icon("pin")}${Matchday.esc(match.venue)}</span>
        </span>
        <span>${match.round ? `Matchweek ${match.round}` : ""} · ${Matchday.esc(match.league.season)}</span>
      </div>
      <div class="sb-main">
        ${teamBlock(match.homeTeam, "home")}
        ${scoreCentre()}
        ${teamBlock(match.awayTeam, "away")}
      </div>
      <div class="sb-actions">
        ${isUpcoming ? Matchday.remindButton(match, { on: "Reminder set", off: "Remind me" }) : ""}
        ${isUpcoming ? `<a class="btn btn-sm btn-outline" href="${calendarLink(match)}" download="matchday-${match.id}.ics">${Matchday.icon("calendar")} Add to calendar</a>` : ""}
        <button class="btn btn-sm btn-outline" type="button" data-copy="${Matchday.esc(shareUrl())}">${Matchday.icon("copy")} Copy link</button>
        <a class="btn btn-sm btn-ghost" href="${Matchday.url.team(match.home.id)}">${Matchday.icon("shield")} ${Matchday.esc(match.home.short)} squad</a>
        <a class="btn btn-sm btn-ghost" href="${Matchday.url.team(match.away.id)}">${Matchday.icon("shield")} ${Matchday.esc(match.away.short)} squad</a>
      </div>
      <div class="sb-foot">
        <span>${Matchday.icon("users")}Referee: ${Matchday.esc(match.referee || "To be confirmed")}</span>
        <span>${Matchday.icon("pin")}${Matchday.esc(match.city)}${match.attendance ? ` · Attendance ${match.attendance.toLocaleString()}` : ""}</span>
        <span>${Matchday.icon("clock")}Kick-off ${Matchday.fmtTime(match.kickoff)}</span>
      </div>
    </section>

    <div class="tabs" data-tabs="#match-panels" role="tablist" aria-label="Match information">
      <button class="tab is-active" type="button" role="tab" data-tab="summary" aria-selected="true">Summary</button>
      <button class="tab" type="button" role="tab" data-tab="player-stats" aria-selected="false">Player stats <span class="count">${statsCount}</span></button>
    </div>

    <div id="match-panels">
      <div class="tab-panel" data-panel="summary">
        <div class="match-body">
          <section class="panel" aria-label="${isUpcoming ? "Form guide" : "Key events"}">
            <div class="panel-head">
              <h3>${isUpcoming ? "Form guide" : "Key events"}</h3>
              <span class="panel-sub">${isUpcoming ? "Last five league matches" : (match.status === "live" ? "Live timeline" : "Full time")}</span>
            </div>
            ${isUpcoming ? formGuide(match) : timeline(events, match)}
          </section>
          <div>
            <section class="panel" aria-label="Match information">
              <div class="panel-head"><h3>Match information</h3></div>
              <dl class="info-list">
                <div class="info-row"><dt>Competition</dt><dd>${Matchday.esc(match.league.name)}</dd></div>
                <div class="info-row"><dt>Matchweek</dt><dd>${match.round || "—"}</dd></div>
                <div class="info-row"><dt>Date</dt><dd>${Matchday.esc(Matchday.fmtDateLong(match.kickoff))}</dd></div>
                <div class="info-row"><dt>Kick-off</dt><dd>${Matchday.fmtTime(match.kickoff)}</dd></div>
                <div class="info-row"><dt>Stadium</dt><dd>${Matchday.esc(match.venue)}</dd></div>
                <div class="info-row"><dt>City</dt><dd>${Matchday.esc(match.city)}</dd></div>
                <div class="info-row"><dt>Referee</dt><dd>${Matchday.esc(match.referee || "TBC")}</dd></div>
                <div class="info-row"><dt>Attendance</dt><dd>${match.attendance ? match.attendance.toLocaleString() : "—"}</dd></div>
                <div class="info-row"><dt>Status</dt><dd>${match.status === "live" ? `Live · <span data-live-minute="${match.id}">${Matchday.liveMinuteText(match)}</span>` : match.status === "finished" ? "Finished" : "Upcoming"}</dd></div>
              </dl>
            </section>
            <section class="panel" aria-label="Head to head">
              <div class="panel-head"><h3>Head to head</h3><span class="panel-sub">Recent meetings</span></div>
              ${headToHead(match)}
            </section>
          </div>
        </div>
      </div>

      <div class="tab-panel" data-panel="player-stats" hidden>
        ${isUpcoming ? `<div class="empty-state"><div class="empty-icon">${Matchday.icon("users")}</div><h3>Line-ups not available yet</h3><p>Player statistics appear here once the match kicks off. Check back after kick-off at ${Matchday.fmtTime(match.kickoff)}.</p>${Matchday.remindButton(match)}</div>`
    : `<div class="match-body equal">
            ${teamStatsPanel(match.homeTeam, stats.home, match)}
            ${teamStatsPanel(match.awayTeam, stats.away, match)}
          </div>
          <p class="compare-note">Ratings are simulated match scores out of 10. Minutes, goals and assists come from the match line-ups.</p>`}
      </div>
    </div>`;

  wireSummaryLinks(match);
  Matchday.setupTabs();
}

function shareUrl() {
  return `${location.href.split("?")[0]}?id=${match.id}`;
}

function teamStatsPanel(team, rows, match) {
  const goals = rows.reduce((sum, row) => sum + row.goals, 0);
  const assists = rows.reduce((sum, row) => sum + row.assists, 0);
  return `<section class="panel" aria-label="${Matchday.esc(team.name)} player stats">
    <div class="panel-head">
      <h3 style="display:flex;align-items:center;gap:8px;">${Matchday.crest(team, "sm")} ${Matchday.esc(team.name)}</h3>
      <span class="panel-sub">${rows.length} players · ${goals} goal${goals === 1 ? "" : "s"} · ${assists} assist${assists === 1 ? "" : "s"}</span>
    </div>
    <div class="table-wrap table-plain">
      <table class="data-table stat-table">
        <thead>
          <tr>
            <th scope="col">Player</th>
            <th scope="col" class="num">Min</th>
            <th scope="col" class="num">G</th>
            <th scope="col" class="num">A</th>
            <th scope="col" class="num">Rating</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => {
            const player = row.player;
            return `<tr>
              <td>
                <a class="table-player" href="${Matchday.url.player(player.id)}">
                  ${Matchday.avatar(player, "xs")}
                  <span><span class="player-name">${Matchday.esc(player.name)}</span>
                  <span class="player-meta">${Matchday.esc(player.position)}${row.started ? " · started" : " · sub"}</span></span>
                </a>
              </td>
              <td class="num">${row.minutes}'</td>
              <td class="num">${row.goals}</td>
              <td class="num">${row.assists}</td>
              <td class="num"><span class="rating ${Matchday.ratingClass(row.rating)}">${row.rating.toFixed(1)}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </section>`;
}

function enrichEvents(match) {
  return (match.events || []).slice().sort((a, b) => a.minute - b.minute).map((event) => {
    const player = Store.player(event.playerId);
    const assist = event.assistId ? Store.player(event.assistId) : null;
    const team = event.side === "home" ? match.homeTeam : match.awayTeam;
    return { ...event, player, assist, team };
  });
}

function timeline(events, match) {
  if (!events.length) {
    return `<p class="empty">No goals or cards yet in this match.</p>`;
  }
  let rows = "";
  let halfTimeAdded = false;
  events.forEach((event) => {
    if (!halfTimeAdded && event.minute > 45) {
      rows += `<li class="timeline-event" style="display:block;"><div class="half-time">Half time</div></li>`;
      halfTimeAdded = true;
    }
    const isGoal = event.type === "goal";
    const iconMarkup = isGoal
      ? `<span class="timeline-icon goal">${Matchday.icon("ball")}</span>`
      : `<span class="timeline-icon ${event.type}"><span class="card-shape ${event.type}"></span></span>`;
    const label = isGoal ? "Goal" : event.type === "yellow" ? "Yellow card" : "Red card";
    const assistText = event.assist ? ` <small>Assist: ${Matchday.esc(event.assist.name)}</small>` : "";
    rows += `<li class="timeline-event">
      <span class="timeline-minute">${event.minute}'</span>
      ${iconMarkup}
      <span class="timeline-detail">
        <strong>${label}: ${event.player ? Matchday.esc(event.player.name) : "Unknown"}</strong>${assistText}
        <small>${Matchday.esc(event.team.name)}</small>
      </span>
    </li>`;
  });
  if (!halfTimeAdded && match.status !== "live") {
    rows += `<li class="timeline-event" style="display:block;"><div class="half-time">Half time</div></li>`;
  }
  return `<ul class="timeline">${rows}</ul>`;
}

function formGuide(match) {
  const block = (team) => {
    const standing = Store.teamStanding(team.id);
    const scorers = Store.teamSummary(team)?.scorers || [];
    return `<div class="team-form-block">
      <div class="team-form-head">
        ${Matchday.crest(team, "sm")}
        <span><a class="link" href="${Matchday.url.team(team.id)}">${Matchday.esc(team.name)}</a>
        <small>${standing ? `${standing.position}${ordinal(standing.position)} · ${standing.points} pts` : ""}</small></span>
        <span class="team-form-dots">${standing ? Matchday.formDots(standing.form) : ""}</span>
      </div>
      <p class="team-form-scorers">${scorers.length
        ? `Top scorer: <a class="link" href="${Matchday.url.player(scorers[0].player.id)}">${Matchday.esc(scorers[0].player.name)}</a> (${scorers[0].stats.goals})`
        : "No goals scored yet."}</p>
    </div>`;
  };
  return `<div class="form-guide">
    ${block(match.homeTeam)}
    ${block(match.awayTeam)}
    <p class="form-guide-note">Positions and form come from the ${Matchday.esc(match.league.name)} table. A reminder for this match can be set from the scoreboard above or from My Reminders.</p>
  </div>`;
}

function headToHead(match) {
  const games = Store.headToHead(match.home.id, match.away.id, 4)
    .filter((game) => game.id !== match.id);
  if (!games.length) return `<p class="empty">No previous meetings in this dataset.</p>`;
  return `<ul class="h2h-list">
    ${games.map((game) => {
      const atHome = game.home.id === match.home.id;
      const goalsFor = atHome ? game.score.home : game.score.away;
      const goalsAgainst = atHome ? game.score.away : game.score.home;
      const outcome = goalsFor > goalsAgainst ? "win" : goalsFor === goalsAgainst ? "draw" : "loss";
      const label = outcome === "win" ? "Win" : outcome === "draw" ? "Draw" : "Loss";
      return `<li>
        <a class="h2h-row" href="${Matchday.url.match(game.id)}">
          <span class="h2h-date">${Matchday.fmtDate(game.kickoff)}</span>
          <span class="h2h-teams">
            ${Matchday.crest(game.homeTeam, "xs")}
            <b>${game.score.home} – ${game.score.away}</b>
            ${Matchday.crest(game.awayTeam, "xs")}
          </span>
          <span class="h2h-result ${outcome}">${label} <small>${Matchday.esc(match.home.short)}</small></span>
        </a>
      </li>`;
    }).join("")}
  </ul>`;
}

function wireSummaryLinks(match) {
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.setAttribute("data-copy", shareUrl());
  });
}
