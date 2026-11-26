/* ============================================================
   store.js - the shared data layer for all nine pages.
   It reads the sample data files, joins teams / players /
   matches together and calculates season statistics, league
   tables, form and head-to-head records from match events.

   No page markup is created here, so the same numbers are
   used everywhere: Match Detail, Players, Player Profile,
   Compare Players, Team and Leagues all read from Store.
   ============================================================ */
const Store = (() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const data = root.MATCHDAY_DATA || { leagues: [], matches: [], updatedAt: null };
  const rawTeams = root.MATCHDAY_TEAMS || [];
  const rawPlayers = root.MATCHDAY_PLAYERS || [];

  const leagueById = new Map(data.leagues.map((l) => [String(l.id), l]));
  const teamById = new Map(rawTeams.map((t) => [t.id, t]));
  const playerById = new Map(rawPlayers.map((p) => [p.id, p]));

  const POSITION_ORDER = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

  /* ---------- small deterministic random helpers ---------- */
  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngFor(...parts) {
    return mulberry32(hashStr(parts.join("|")));
  }

  const dateKey = (value) => {
    const d = new Date(value);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  /* ---------- enrich teams ---------- */
  const teams = rawTeams.map((team) => ({
    ...team,
    league: leagueById.get(String(team.leagueId)),
    squad: [],
    matchIds: [],
  }));
  teams.forEach((t) => teamById.set(t.id, t));

  /* ---------- enrich players ---------- */
  const players = rawPlayers.map((player) => ({
    ...player,
    team: teamById.get(player.teamId),
    league: leagueById.get(String(player.leagueId)),
  }));
  players.forEach((p) => playerById.set(p.id, p));

  players.forEach((p) => {
    if (p.team) p.team.squad.push(p);
  });
  teams.forEach((team) => {
    team.squad.sort((a, b) => POSITION_ORDER[a.positionCode] - POSITION_ORDER[b.positionCode]
      || a.number - b.number);
    team.playerCount = team.squad.length;
  });

  /* ---------- enrich matches ---------- */
  // The sample season is anchored to 26 Nov 2026 13:15 UTC. Shift every
  // kick-off by the time since then so the demo always has matches that
  // are genuinely live, upcoming and finished whenever it is opened.
  const SAMPLE_ANCHOR = new Date("2026-11-26T13:15:00Z").getTime();
  function sampleShift() {
    const fallback = Math.round((Date.now() - SAMPLE_ANCHOR) / 60000) * 60000;
    try {
      if (typeof sessionStorage === "undefined") return fallback;
      const saved = Number(sessionStorage.getItem("matchday.demoShift"));
      if (Number.isFinite(saved) && saved !== 0) return saved;
      sessionStorage.setItem("matchday.demoShift", String(fallback));
      return fallback;
    } catch (e) {
      return fallback;
    }
  }
  const kickoffShift = data.isSample ? sampleShift() : 0;

  const matches = data.matches
    .map((match) => {
      const homeTeam = teamById.get(match.home.id) || match.home;
      const awayTeam = teamById.get(match.away.id) || match.away;
      const kickoffDate = new Date(new Date(match.kickoff).getTime() + kickoffShift);
      return {
        ...match,
        league: leagueById.get(String(match.leagueId)),
        homeTeam,
        awayTeam,
        kickoff: kickoffDate.toISOString(),
        kickoffDate,
        dateKey: dateKey(kickoffDate),
        round: match.round || null,
      };
    })
    .sort((a, b) => a.kickoffDate - b.kickoffDate);

  const matchById = new Map(matches.map((m) => [m.id, m]));
  matches.forEach((m) => {
    if (m.homeTeam && m.homeTeam.matchIds) m.homeTeam.matchIds.push(m.id);
    if (m.awayTeam && m.awayTeam.matchIds) m.awayTeam.matchIds.push(m.id);
  });

  const leagueMatches = new Map();
  matches.forEach((m) => {
    const key = String(m.leagueId);
    if (!leagueMatches.has(key)) leagueMatches.set(key, []);
    leagueMatches.get(key).push(m);
  });

  const leagueTeams = new Map();
  teams.forEach((t) => {
    const key = String(t.leagueId);
    if (!leagueTeams.has(key)) leagueTeams.set(key, []);
    leagueTeams.get(key).push(t);
  });

  const matchesByTeam = new Map();
  matches.forEach((m) => {
    [m.home.id, m.away.id].forEach((id) => {
      if (!matchesByTeam.has(id)) matchesByTeam.set(id, []);
      matchesByTeam.get(id).push(m);
    });
  });

  /* ---------- live minute (ticker offset stored in sessionStorage) ---------- */
  function liveOffset(match) {
    try {
      const key = `matchday.live.${match.id}`;
      let start = sessionStorage.getItem(key);
      if (!start) {
        start = String(Date.now());
        sessionStorage.setItem(key, start);
      }
      return Math.floor((Date.now() - Number(start)) / 30000); // 1 sim minute / 30s
    } catch (e) {
      return 0;
    }
  }

  function liveMinute(match) {
    if (match.status !== "live") return match.status === "finished" ? 90 : 0;
    return Math.min(90, (match.minute || 1) + liveOffset(match));
  }

  /* ---------- calculate one side of a match ---------- */
  const sideCache = new Map();

  function isFinished(match) {
    return match.status === "finished";
  }

  function sideRows(match, side) {
    const cacheKey = `${match.id}:${side}`;
    if (sideCache.has(cacheKey)) return sideCache.get(cacheKey);

    const team = side === "home" ? match.homeTeam : match.awayTeam;
    if (!team || !team.squad || match.status === "upcoming") {
      sideCache.set(cacheKey, []);
      return [];
    }

    const squad = team.squad;
    const current = match.status === "live" ? liveMinute(match) : 90;
    const rnd = rngFor(match.id, side, "lineup");

    // Goalkeeper rotation: each club gives its back-up one start.
    const playedMatches = (matchesByTeam.get(team.id) || [])
      .filter((m) => m.status !== "upcoming");
    const rotationIndex = playedMatches.length ? hashStr(team.id) % playedMatches.length : -1;
    const backupStarts = playedMatches.findIndex((m) => m.id === match.id) === rotationIndex;

    const gks = squad.filter((p) => p.positionCode === "GK");
    const firstChoice = gks.find((p) => p.squadRole === "XI") || gks[0];
    const backup = gks.find((p) => p.id !== (firstChoice && firstChoice.id));
    const keeper = backupStarts && backup ? backup : firstChoice;

    const starters = squad.filter((p) => p.squadRole === "XI"
      && p.positionCode !== "GK");
    if (keeper) starters.push(keeper);

    const bench = squad.filter((p) => p.squadRole === "SUB");
    const subWindows = bench.map(() => 58 + Math.floor(rnd() * 20)); // 58 - 77

    // Players involved in a goal cannot be substituted before that goal.
    const involvement = new Map();
    (match.events || []).forEach((event) => {
      if (event.type !== "goal") return;
      if (event.side !== side) return;
      [event.playerId, event.assistId].filter(Boolean).forEach((id) => {
        involvement.set(id, Math.max(involvement.get(id) || 0, event.minute));
      });
    });

    const candidates = starters
      .filter((p) => p.positionCode !== "GK")
      .filter((p) => (involvement.get(p.id) || 0) <= 55)
      .sort((a, b) => (involvement.get(a.id) || 0) - (involvement.get(b.id) || 0));

    const substitutions = [];
    bench.forEach((sub, index) => {
      const entry = subWindows[index];
      if (current > entry + 8 && candidates.length) {
        const out = candidates.shift();
        substitutions.push({ sub, out, entry });
      }
    });
    const offByPlayer = new Map(substitutions.map((item) => [item.out.id, item.entry]));

    const rows = [];
    const addRow = (player, minutes, started) => {
      if (minutes <= 0) return;
      rows.push({
        playerId: player.id,
        started,
        minutes,
        goals: 0,
        assists: 0,
        rating: 0,
      });
    };

    starters.forEach((player) => {
      const off = offByPlayer.get(player.id);
      const minutes = Math.min(current, off || 90);
      addRow(player, minutes, true);
    });

    substitutions.forEach(({ sub, entry }) => {
      addRow(sub, Math.min(current, 90) - entry, false);
    });

    // Goals and assists straight from the match events.
    (match.events || []).forEach((event) => {
      if (event.type !== "goal" || event.side !== side) return;
      const scorer = rows.find((r) => r.playerId === event.playerId);
      if (scorer) scorer.goals += 1;
      if (event.assistId) {
        const assister = rows.find((r) => r.playerId === event.assistId);
        if (assister) assister.assists += 1;
      }
    });

    const homeScore = match.score ? match.score.home : 0;
    const awayScore = match.score ? match.score.away : 0;
    const goalsFor = side === "home" ? homeScore : awayScore;
    const goalsAgainst = side === "home" ? awayScore : homeScore;
    const result = goalsFor > goalsAgainst ? 1 : goalsFor === goalsAgainst ? 0 : -1;

    rows.forEach((row) => {
      const player = playerById.get(row.playerId);
      const rand = rngFor(match.id, row.playerId, "rating")();
      let rating = 6.05 + rand * 0.95;
      rating += row.goals * 0.85 + row.assists * 0.5;
      rating += result === 1 ? 0.35 : result === 0 ? 0.1 : -0.08;
      if (player && (player.positionCode === "GK" || player.positionCode === "DEF")) {
        if (goalsAgainst === 0) rating += 0.35;
        if (goalsAgainst >= 3) rating -= 0.2;
      }
      row.rating = Math.round(Math.min(9.7, Math.max(5.6, rating)) * 10) / 10;
    });

    sideCache.set(cacheKey, rows);
    return rows;
  }

  /* ---------- season statistics, appearances and match stats ---------- */
  let seasonCache = null;

  function buildSeason() {
    const byPlayer = new Map();
    const appearances = new Map();
    const matchStats = new Map();

    const blank = () => ({
      played: 0, minutes: 0, goals: 0, assists: 0, ratingSum: 0,
      cleanSheets: 0, wins: 0, draws: 0, losses: 0, started: 0,
    });

    matches.forEach((match) => {
      if (match.status === "upcoming") return;
      const sides = { home: sideRows(match, "home"), away: sideRows(match, "away") };
      matchStats.set(match.id, sides);

      ["home", "away"].forEach((side) => {
        const teamId = side === "home" ? match.home.id : match.away.id;
        const opponentId = side === "home" ? match.away.id : match.home.id;
        const goalsFor = match.score ? match.score[side] : 0;
        const goalsAgainst = match.score
          ? match.score[side === "home" ? "away" : "home"] : 0;
        const result = goalsFor > goalsAgainst ? "W" : goalsFor === goalsAgainst ? "D" : "L";

        sides[side].forEach((row) => {
          if (!byPlayer.has(row.playerId)) byPlayer.set(row.playerId, blank());
          const stats = byPlayer.get(row.playerId);
          stats.played += 1;
          stats.started += row.started ? 1 : 0;
          stats.minutes += row.minutes;
          stats.goals += row.goals;
          stats.assists += row.assists;
          stats.ratingSum += row.rating;
          if (result === "W") stats.wins += 1;
          else if (result === "D") stats.draws += 1;
          else stats.losses += 1;
          const player = playerById.get(row.playerId);
          if (player && (player.positionCode === "GK" || player.positionCode === "DEF")
            && goalsAgainst === 0 && row.minutes >= 60) {
            stats.cleanSheets += 1;
          }

          if (!appearances.has(row.playerId)) appearances.set(row.playerId, []);
          appearances.get(row.playerId).push({
            match,
            teamId,
            opponentId,
            minutes: row.minutes,
            goals: row.goals,
            assists: row.assists,
            rating: row.rating,
            result,
            goalsFor,
            goalsAgainst,
            started: row.started,
          });
        });
      });
    });

    const playerSeasons = new Map();
    players.forEach((player) => {
      const stats = byPlayer.get(player.id) || blank();
      playerSeasons.set(player.id, {
        ...stats,
        avgRating: stats.played ? Math.round((stats.ratingSum / stats.played) * 10) / 10 : 0,
      });
    });

    const appearanceList = new Map();
    appearances.forEach((list, playerId) => {
      appearanceList.set(playerId, list.slice().sort((a, b) => b.match.kickoffDate - a.match.kickoffDate));
    });

    seasonCache = { byPlayer: playerSeasons, appearances: appearanceList, matchStats };
  }

  function ensureSeason() {
    if (!seasonCache) buildSeason();
    return seasonCache;
  }

  function playerSeason(playerId) {
    return ensureSeason().byPlayer.get(playerId) || null;
  }

  function playerAppearances(playerId) {
    return ensureSeason().appearances.get(playerId) || [];
  }

  function matchStats(matchId) {
    const stats = ensureSeason().matchStats.get(matchId);
    if (!stats) return { home: [], away: [] };
    const enrich = (rows) => rows.map((row) => ({
      ...row,
      player: playerById.get(row.playerId),
      team: teamById.get(playerById.get(row.playerId)?.teamId),
    }));
    return { home: enrich(stats.home), away: enrich(stats.away) };
  }

  /* ---------- league tables ---------- */
  const standingsCache = new Map();

  function standings(leagueId) {
    const key = String(leagueId);
    if (standingsCache.has(key)) return standingsCache.get(key);

    const table = new Map();
    const teamsInLeague = leagueTeams.get(key) || [];
    teamsInLeague.forEach((team) => {
      table.set(team.id, {
        team, played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, form: [],
      });
    });

    (leagueMatches.get(key) || []).forEach((match) => {
      if (match.status !== "finished" || !match.score) return;
      const sides = [
        { id: match.home.id, goals: match.score.home, conceded: match.score.away },
        { id: match.away.id, goals: match.score.away, conceded: match.score.home },
      ];
      sides.forEach(({ id, goals, conceded }) => {
        const row = table.get(id);
        if (!row) return;
        row.played += 1;
        row.goalsFor += goals;
        row.goalsAgainst += conceded;
        if (goals > conceded) { row.won += 1; row.points += 3; row.form.push("W"); }
        else if (goals === conceded) { row.drawn += 1; row.points += 1; row.form.push("D"); }
        else { row.lost += 1; row.form.push("L"); }
      });
    });

    const rows = [...table.values()].map((row) => ({
      ...row,
      goalDifference: row.goalsFor - row.goalsAgainst,
      form: row.form.slice(-5),
    }));
    rows.sort((a, b) => b.points - a.points
      || b.goalDifference - a.goalDifference
      || b.goalsFor - a.goalsFor
      || a.team.name.localeCompare(b.team.name));
    rows.forEach((row, index) => { row.position = index + 1; });
    standingsCache.set(key, rows);
    return rows;
  }

  function teamStanding(teamId) {
    const team = teamById.get(teamId);
    if (!team) return null;
    return standings(team.leagueId).find((row) => row.team.id === teamId) || null;
  }

  /* ---------- fixtures and results ---------- */
  function teamMatches(teamId) {
    return (matchesByTeam.get(teamId) || []).slice().sort((a, b) => a.kickoffDate - b.kickoffDate);
  }

  function leagueFixtures(leagueId, status) {
    const list = (leagueMatches.get(String(leagueId)) || []);
    return status ? list.filter((m) => m.status === status) : list;
  }

  function nextFixture(teamId) {
    const list = matchesByTeam.get(teamId) || [];
    return list
      .filter((m) => m.status !== "finished")
      .sort((a, b) => a.kickoffDate - b.kickoffDate)[0] || null;
  }

  function recentResults(teamId, limit = 5) {
    return (matchesByTeam.get(teamId) || [])
      .filter((m) => m.status === "finished")
      .sort((a, b) => b.kickoffDate - a.kickoffDate)
      .slice(0, limit);
  }

  function upcomingMatches(limit) {
    const list = matches
      .filter((m) => m.status !== "finished")
      .sort((a, b) => a.kickoffDate - b.kickoffDate);
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }

  function liveMatches() {
    return matches.filter((m) => m.status === "live");
  }

  function headToHead(teamA, teamB, limit = 4) {
    return matches
      .filter((m) => m.status === "finished"
        && ((m.home.id === teamA && m.away.id === teamB)
          || (m.home.id === teamB && m.away.id === teamA)))
      .sort((a, b) => b.kickoffDate - a.kickoffDate)
      .slice(0, limit);
  }

  /* ---------- scoring charts ---------- */
  function scoringChart(leagueId, limit) {
    const allowed = new Set(
      leagueId ? (leagueTeams.get(String(leagueId)) || []).map((t) => t.id) : teams.map((t) => t.id)
    );
    const rows = players
      .filter((p) => allowed.has(p.teamId))
      .map((p) => ({ player: p, stats: playerSeason(p.id) }))
      .filter((row) => row.stats && row.stats.goals > 0)
      .sort((a, b) => b.stats.goals - a.stats.goals
        || b.stats.assists - a.stats.assists
        || a.stats.minutes - b.stats.minutes);
    return typeof limit === "number" ? rows.slice(0, limit) : rows;
  }

  /* ---------- search ---------- */
  function search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (q.length < 2) return [];
    const results = [];
    const starts = (text) => text.toLowerCase().startsWith(q);

    players
      .filter((p) => p.name.toLowerCase().includes(q)
        || (p.team && p.team.name.toLowerCase().includes(q)))
      .sort((a, b) => Number(starts(b.name)) - Number(starts(a.name)) || a.name.localeCompare(b.name))
      .slice(0, 5)
      .forEach((p) => results.push({
        type: "Player", id: p.id, title: p.name,
        subtitle: `${p.team ? p.team.name : ""} · ${p.position}`,
      }));

    teams
      .filter((t) => t.name.toLowerCase().includes(q)
        || t.short.toLowerCase() === q
        || (t.nickname || "").toLowerCase().includes(q))
      .sort((a, b) => Number(starts(b.name)) - Number(starts(a.name)) || a.name.localeCompare(b.name))
      .slice(0, 4)
      .forEach((t) => results.push({
        type: "Team", id: t.id, title: t.name,
        subtitle: `${t.league ? t.league.name : ""} · ${t.city}`,
      }));

    data.leagues
      .filter((l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((l) => results.push({
        type: "League", id: String(l.id), title: l.name,
        subtitle: `${l.country} · ${l.season}`,
      }));

    matches
      .filter((m) => `${m.home.name} ${m.away.name} ${m.league ? m.league.name : ""}`
        .toLowerCase().includes(q))
      .sort((a, b) => b.kickoffDate - a.kickoffDate)
      .slice(0, 4)
      .forEach((m) => results.push({
        type: "Match", id: m.id,
        title: `${m.home.name} vs ${m.away.name}`,
        subtitle: `${m.league ? m.league.name : ""} · ${m.status === "live" ? "Live" : m.status}`,
      }));

    return results;
  }

  /* ---------- team season summary ---------- */
  function teamSummary(team) {
    if (!team) return null;
    const row = teamStanding(team.id);
    const scorers = scoringChart(team.leagueId)
      .filter((entry) => entry.player.teamId === team.id)
      .slice(0, 3);
    return { standing: row, scorers };
  }

  /* ---------- public API ---------- */
  return {
    data,
    leagues: data.leagues,
    teams,
    players,
    matches,
    season: data.season || "2026/27",
    updatedAt: data.isSample ? new Date() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
    isSample: Boolean(data.isSample),

    league: (id) => leagueById.get(String(id)) || null,
    team: (id) => teamById.get(id) || null,
    player: (id) => playerById.get(id) || null,
    match: (id) => matchById.get(id) || null,

    teamsInLeague: (leagueId) => (leagueTeams.get(String(leagueId)) || []).slice(),
    squad: (teamId) => {
      const team = teamById.get(teamId);
      return team ? team.squad.slice() : [];
    },
    leagueFixtures,
    teamMatches,
    matchesByTeam,
    nextFixture,
    recentResults,
    upcomingMatches,
    liveMatches,
    headToHead,
    standings,
    teamStanding,
    teamSummary,
    scoringChart,

    playerSeason,
    playerAppearances,
    matchStats,
    liveMinute,
    dateKey,
    search,

    positionOrder: POSITION_ORDER,
  };
})();
