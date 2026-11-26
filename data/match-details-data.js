/* ============================================================
   match-details-data.js - extra detail for individual matches.
   !! SAMPLE DATA: player names are placeholders and every number is
   !! made up. Real API data will replace this file, same shape.
   Keys are match ids from matches-data.js. A match with no entry
   here simply shows "no details in this snapshot".
   ============================================================ */
window.MATCH_DETAILS = {
  s1: {
    venue: "Sample Stadium, London",
    events: [
      { minute: 12, type: "goal", team: "home", player: "Sample Player 9" },
      { minute: 34, type: "yellow", team: "away", player: "Sample Player 4" },
    ],
    players: {
      home: [
        { name: "Sample Player 1", pos: "GK", minutes: 63, goals: 0, assists: 0, shots: 0 },
        { name: "Sample Player 8", pos: "MF", minutes: 63, goals: 0, assists: 1, shots: 2 },
        { name: "Sample Player 9", pos: "FW", minutes: 63, goals: 1, assists: 0, shots: 4 },
      ],
      away: [
        { name: "Sample Player 1", pos: "GK", minutes: 63, goals: 0, assists: 0, shots: 0 },
        { name: "Sample Player 4", pos: "DF", minutes: 63, goals: 0, assists: 0, shots: 0 },
        { name: "Sample Player 10", pos: "FW", minutes: 63, goals: 0, assists: 0, shots: 3 },
      ],
    },
  },
  s6: {
    venue: "Sample Park, Birmingham",
    events: [
      { minute: 22, type: "goal", team: "home", player: "Sample Player 7" },
      { minute: 55, type: "goal", team: "away", player: "Sample Player 11" },
      { minute: 81, type: "goal", team: "home", player: "Sample Player 9" },
    ],
    players: {
      home: [
        { name: "Sample Player 7", pos: "MF", minutes: 90, goals: 1, assists: 0, shots: 3 },
        { name: "Sample Player 9", pos: "FW", minutes: 90, goals: 1, assists: 1, shots: 5 },
      ],
      away: [
        { name: "Sample Player 11", pos: "FW", minutes: 90, goals: 1, assists: 0, shots: 2 },
        { name: "Sample Player 5", pos: "DF", minutes: 90, goals: 0, assists: 0, shots: 1 },
      ],
    },
  },
};
