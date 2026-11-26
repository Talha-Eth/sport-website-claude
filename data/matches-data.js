/* ============================================================
   matches-data.js - the data the Home page reads.
   !! SAMPLE DATA: team names are real, but the scores, times and
   !! match list are MADE UP so we can build the pages now.
   Later a script will overwrite this file with real API data in
   exactly this shape, and set isSample to false.
   ============================================================ */
window.MATCHDAY_DATA = {
  isSample: true,
  updatedAt: "2026-11-26T12:00:00Z",
  leagues: [
    { id: 47, name: "Premier League" },
    { id: 87, name: "LaLiga" },
  ],
  // status is one of: "live", "upcoming", "finished"
  matches: [
    { id: "s1", leagueId: 47, league: "Premier League", status: "live", minute: 63, kickoff: "2026-11-26T19:30:00Z",
      home: { name: "Arsenal", short: "ARS" }, away: { name: "Chelsea", short: "CHE" }, score: { home: 1, away: 0 } },
    { id: "s2", leagueId: 87, league: "LaLiga", status: "live", minute: 28, kickoff: "2026-11-26T20:00:00Z",
      home: { name: "Real Madrid", short: "RMA" }, away: { name: "Sevilla", short: "SEV" }, score: { home: 0, away: 0 } },
    { id: "s3", leagueId: 47, league: "Premier League", status: "upcoming", kickoff: "2026-11-28T15:00:00Z",
      home: { name: "Liverpool", short: "LIV" }, away: { name: "Manchester City", short: "MCI" }, score: null },
    { id: "s4", leagueId: 87, league: "LaLiga", status: "upcoming", kickoff: "2026-11-28T20:00:00Z",
      home: { name: "Barcelona", short: "BAR" }, away: { name: "Atletico Madrid", short: "ATM" }, score: null },
    { id: "s5", leagueId: 47, league: "Premier League", status: "upcoming", kickoff: "2026-11-29T16:30:00Z",
      home: { name: "Tottenham", short: "TOT" }, away: { name: "Newcastle", short: "NEW" }, score: null },
    { id: "s6", leagueId: 47, league: "Premier League", status: "finished", kickoff: "2026-11-24T20:00:00Z",
      home: { name: "Aston Villa", short: "AVL" }, away: { name: "Everton", short: "EVE" }, score: { home: 2, away: 1 } },
    { id: "s7", leagueId: 87, league: "LaLiga", status: "finished", kickoff: "2026-11-23T20:00:00Z",
      home: { name: "Valencia", short: "VAL" }, away: { name: "Villarreal", short: "VIL" }, score: { home: 1, away: 1 } },
    { id: "s8", leagueId: 87, league: "LaLiga", status: "finished", kickoff: "2026-11-23T17:30:00Z",
      home: { name: "Real Sociedad", short: "RSO" }, away: { name: "Girona", short: "GIR" }, score: { home: 3, away: 0 } },
  ],
};
