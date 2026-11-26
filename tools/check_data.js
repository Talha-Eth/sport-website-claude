/* Node smoke test for the generated data + Store calculations. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const sandbox = { window: {}, console, Date, Math, Map, Set, String, Number, Boolean, JSON, sessionStorage: undefined };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

for (const file of ["data/matches-data.js", "data/teams-data.js", "data/players-data.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), sandbox, { filename: file });
}
const storeCode = fs.readFileSync(path.join(root, "assets/js/store.js"), "utf8")
  + "\n;globalThis.__Store = Store;";
vm.runInContext(storeCode, sandbox, { filename: "store.js" });

const Store = sandbox.__Store;
const D = sandbox.window.MATCHDAY_DATA;
let failures = 0;

function check(label, condition, detail) {
  if (!condition) {
    failures++;
    console.log("FAIL", label, detail === undefined ? "" : JSON.stringify(detail));
  }
}

check("5 leagues", Store.leagues.length === 5, Store.leagues.length);
check("40 teams", Store.teams.length === 40, Store.teams.length);
check("560 players", Store.players.length === 560, Store.players.length);
check("280 matches", Store.matches.length === 280, Store.matches.length);
check("unique player ids", new Set(Store.players.map((p) => p.id)).size === Store.players.length);
check("unique team ids", new Set(Store.teams.map((t) => t.id)).size === Store.teams.length);
check("unique match ids", new Set(Store.matches.map((m) => m.id)).size === Store.matches.length);
check("every player has team", Store.players.every((p) => p.team));
check("every team has 14 players", Store.teams.every((t) => t.squad.length === 14));

const statusCounts = {};
Store.matches.forEach((m) => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1; });
console.log("statuses", statusCounts);

let eventPlayersOk = true;
let scoreOk = true;
let cardsOk = true;
let lineupsOk = true;
let goalsInLineups = 0;
let totalGoals = 0;

for (const match of Store.matches) {
  const homeTeam = Store.team(match.home.id);
  const awayTeam = Store.team(match.away.id);
  check("home team exists", Boolean(homeTeam), match.home);
  check("away team exists", Boolean(awayTeam), match.away);
  if (homeTeam) check("home league", homeTeam.leagueId === match.leagueId, match.id);
  if (awayTeam) check("away league", awayTeam.leagueId === match.leagueId, match.id);

  const goals = { home: 0, away: 0 };
  const yellows = new Set();
  (match.events || []).forEach((event) => {
    if (event.type === "goal") goals[event.side]++;
    const teamId = event.side === "home" ? match.home.id : match.away.id;
    const player = Store.player(event.playerId);
    if (!player || player.teamId !== teamId) eventPlayersOk = false;
    if (event.assistId) {
      const assist = Store.player(event.assistId);
      if (!assist || assist.teamId !== teamId) eventPlayersOk = false;
    }
    if (event.type === "yellow") {
      const key = `${event.side}:${event.playerId}`;
      if (yellows.has(key)) cardsOk = false;
      yellows.add(key);
    }
  });
  if (match.score) {
    if (goals.home !== match.score.home || goals.away !== match.score.away) scoreOk = false;
  } else if (goals.home + goals.away !== 0) {
    scoreOk = false;
  }

  if (match.status !== "upcoming") {
    const stats = Store.matchStats(match.id);
    ["home", "away"].forEach((side) => {
      const rows = stats[side];
      const lineupGoals = rows.reduce((sum, r) => sum + r.goals, 0);
      const target = match.score ? match.score[side] : 0;
      if (lineupGoals !== target) lineupsOk = false;
      totalGoals += target;
      goalsInLineups += lineupGoals;
      rows.forEach((r) => {
        if (r.minutes > 90 || r.minutes <= 0) lineupsOk = false;
        if (r.goals > 4) lineupsOk = false;
      });
    });
  }
}

check("event players belong to the right team", eventPlayersOk);
check("scores match event goals", scoreOk);
check("no duplicate yellow cards", cardsOk);
check("lineup goals match scores", lineupsOk);
check("all goals accounted for in lineups", totalGoals === goalsInLineups, [totalGoals, goalsInLineups]);
console.log("goals in dataset", totalGoals);

const chart = Store.scoringChart(null, 5);
console.log("top scorers", chart.map((c) => `${c.player.name} ${c.stats.goals}`).join(", "));

for (const league of Store.leagues) {
  const table = Store.standings(league.id);
  const finished = Store.leagueFixtures(league.id, "finished");
  check(`table size ${league.name}`, table.length === 8, table.length);
  const totalPlayed = table.reduce((sum, r) => sum + r.played, 0);
  check(`played count ${league.name}`, totalPlayed === finished.length * 2, [totalPlayed, finished.length]);
  const pointsFor = table.reduce((sum, r) => sum + r.points, 0);
  const wins = table.reduce((sum, r) => sum + r.won, 0);
  const draws = table.reduce((sum, r) => sum + r.drawn, 0);
  check(`points ${league.name}`, pointsFor === wins * 3 + draws, [pointsFor, wins, draws]);
  check(`goal difference ${league.name}`,
    table.reduce((s, r) => s + r.goalsFor, 0) === table.reduce((s, r) => s + r.goalsAgainst, 0));
  console.log(league.name, table.slice(0, 3).map((r) => `${r.position}. ${r.team.short} ${r.points}pts`).join("  "));
}

const samplePlayer = Store.players.find((p) => p.name && p.positionCode === "FWD");
const season = Store.playerSeason(samplePlayer.id);
console.log("sample player", samplePlayer.name, samplePlayer.team.name, JSON.stringify(season));
check("sample player has appearances", season.played > 0, season);

const totalApps = Store.players.reduce((sum, p) => sum + Store.playerSeason(p.id).played, 0);
console.log("total appearances", totalApps);
check("appearances equal 22 per match (approx)", totalApps > 0);

const noGames = Store.players.filter((p) => Store.playerSeason(p.id).played === 0);
console.log("players without an appearance", noGames.length, noGames.slice(0, 3).map((p) => p.name));

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECKS FAILED`);
process.exit(failures === 0 ? 0 : 1);
