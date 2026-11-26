/* ============================================================
   compare.js - Page 7, Compare Players.
   Two player pickers, side-by-side player cards and stat bars
   that highlight the higher value in every row.
   ============================================================ */
const root = document.getElementById("compare-root");
const selectA = document.getElementById("compare-a");
const selectB = document.getElementById("compare-b");
const swapButton = document.getElementById("compare-swap");

function validId(value) {
  return value && Store.player(value) ? value : "";
}

let aId = validId(Matchday.param("a"));
let bId = validId(Matchday.param("b"));
if (!aId && bId) { aId = bId; bId = ""; }
if (aId && aId === bId) bId = "";
try { sessionStorage.setItem("matchday.compare", JSON.stringify([aId, bId].filter(Boolean))); } catch (e) { /* ignore */ }

/* ---------- player options ---------- */
function optionsMarkup(selectedId) {
  return `<option value="">Choose a player…</option>`
    + Store.leagues.map((league) => {
      const teams = Store.teamsInLeague(league.id).slice().sort((a, b) => a.name.localeCompare(b.name));
      return `<optgroup label="${Matchday.esc(league.name)}">${teams.map((team) =>
        Store.squad(team.id).slice().sort((a, b) => a.name.localeCompare(b.name)).map((player) =>
          `<option value="${player.id}" ${player.id === selectedId ? "selected" : ""}>${Matchday.esc(player.name)} · ${Matchday.esc(team.short)}</option>`).join("")
      ).join("")}</optgroup>`;
    }).join("");
}

selectA.innerHTML = optionsMarkup(aId);
selectB.innerHTML = optionsMarkup(bId);

/* ---------- metrics ---------- */
function metricsFor(stats) {
  return [
    { key: "played", label: "Appearances", value: stats.played, format: (v) => v },
    { key: "minutes", label: "Minutes", value: stats.minutes, format: (v) => v.toLocaleString() },
    { key: "goals", label: "Goals", value: stats.goals, format: (v) => v },
    { key: "assists", label: "Assists", value: stats.assists, format: (v) => v },
    { key: "involvements", label: "Goal involvements", value: stats.goals + stats.assists, format: (v) => v },
    { key: "rating", label: "Average rating", value: stats.avgRating, format: (v) => (v ? v.toFixed(1) : "—"), scaleMax: 10 },
  ];
}

function playerCard(player, side) {
  if (!player) {
    return `<div class="compare-player ${side} is-empty">
      <span class="avatar avatar-lg" style="--av-1:var(--surface-3);--av-2:var(--line);--av-ink:var(--muted);">?</span>
      <div class="cp-copy"><h3>Choose a player</h3><p class="cp-meta">Use the picker above</p></div>
    </div>`;
  }
  const stats = Store.playerSeason(player.id);
  return `<div class="compare-player ${side}">
    ${Matchday.avatar(player, "lg")}
    <div class="cp-copy">
      <h3><a href="${Matchday.url.player(player.id)}">${Matchday.esc(player.name)}</a></h3>
      <p class="cp-meta">${Matchday.crest(player.team, "xs")} ${Matchday.esc(player.team.name)} · ${player.position} · ${Matchday.esc(player.league.name)}</p>
      <p class="cp-stats">${stats.played} apps · ${stats.goals} goals · ${stats.assists} assists · ${stats.avgRating ? stats.avgRating.toFixed(1) : "—"} rating</p>
    </div>
  </div>`;
}

function barRow(label, aValue, bValue, format, scaleMax) {
  const max = scaleMax || Math.max(aValue, bValue);
  const percent = (value) => (max > 0 && value > 0 ? Math.max(5, Math.round((value / max) * 100)) : 0);
  const aBetter = aValue > bValue;
  const bBetter = bValue > aValue;
  return `<div class="compare-row">
    <div class="compare-side left ${aBetter ? "is-better" : ""}">
      <span class="compare-value">${format(aValue)}</span>
      <span class="compare-track"><span class="compare-fill ${aBetter ? "is-better" : ""}" style="width:${percent(aValue)}%"></span></span>
    </div>
    <div class="compare-label">${Matchday.esc(label)}</div>
    <div class="compare-side right ${bBetter ? "is-better" : ""}">
      <span class="compare-value">${format(bValue)}</span>
      <span class="compare-track"><span class="compare-fill ${bBetter ? "is-better" : ""}" style="width:${percent(bValue)}%"></span></span>
    </div>
  </div>`;
}

function suggestionsMarkup(player) {
  const chart = Store.scoringChart(player.leagueId)
    .filter((row) => row.player.id !== player.id)
    .slice(0, 4);
  if (!chart.length) return "";
  return `<section class="panel compare-empty" aria-label="Suggested comparisons">
    <div class="panel-head"><h3>Add a second player</h3><span class="panel-sub">Suggestions from ${Matchday.esc(player.league.name)}</span></div>
    <p class="small muted" style="margin-bottom:12px;">Pick another player to build the comparison. These are the league's leading scorers.</p>
    <div class="suggestion-grid">
      ${chart.map(({ player: candidate, stats }) => `<button class="suggestion" type="button" data-suggest="${candidate.id}">
        ${Matchday.avatar(candidate, "sm")}
        <span><strong>${Matchday.esc(candidate.name)}</strong><small>${Matchday.esc(candidate.team.name)} · ${stats.goals} goals</small></span>
        ${Matchday.icon("plus")}
      </button>`).join("")}
    </div>
  </section>`;
}

function compareContent(aPlayer, bPlayer) {
  if (!aPlayer && !bPlayer) {
    return Matchday.emptyState({
      iconName: "swap",
      title: "Pick two players to compare",
      text: "Use the two menus above or open the players table and tick any two names.",
      ctaLabel: "Browse players",
      ctaHref: Matchday.url.players,
    });
  }

  const both = aPlayer && bPlayer;
  const same = both && aPlayer.id === bPlayer.id;
  let body = "";

  if (both && !same) {
    const statsA = Store.playerSeason(aPlayer.id);
    const statsB = Store.playerSeason(bPlayer.id);
    const metricsA = metricsFor(statsA);
    const metricsB = metricsFor(statsB);
    let aLeads = 0;
    let bLeads = 0;
    metricsA.forEach((metric, index) => {
      if (metric.value > metricsB[index].value) aLeads += 1;
      if (metric.value < metricsB[index].value) bLeads += 1;
    });
    body = `<section class="panel compare-bars" aria-label="Season stat comparison">
      <div class="panel-head">
        <h3>Season totals</h3>
        <span class="panel-sub">Higher value highlighted</span>
      </div>
      ${metricsA.map((metric, index) =>
        barRow(metric.label, metric.value, metricsB[index].value, metric.format, metric.scaleMax)).join("")}
      <p class="compare-summary">${aPlayer.name.split(" ")[0]} leads ${aLeads} ${aLeads === 1 ? "category" : "categories"}
        · ${bPlayer.name.split(" ")[0]} leads ${bLeads} · ${6 - aLeads - bLeads} tied</p>
    </section>`;
  } else if (same) {
    body = `<div class="notice info">${Matchday.icon("info")}<span>Those are the same player. Pick two different players to compare their season totals.</span></div>`;
  } else {
    body = suggestionsMarkup(aPlayer || bPlayer);
  }

  return `<div class="compare-header">
      ${playerCard(aPlayer, "left")}
      <span class="compare-vs" aria-hidden="true">VS</span>
      ${playerCard(bPlayer, "right")}
    </div>
    ${body}`;
}

function render() {
  const aPlayer = aId ? Store.player(aId) : null;
  const bPlayer = bId ? Store.player(bId) : null;
  root.innerHTML = compareContent(aPlayer, bPlayer);
  Matchday.setParams({ a: aId || null, b: bId || null });
  try { sessionStorage.setItem("matchday.compare", JSON.stringify([aId, bId].filter(Boolean))); } catch (e) { /* ignore */ }
  document.title = aPlayer && bPlayer
    ? `${aPlayer.name.split(" ")[0]} vs ${bPlayer.name.split(" ")[0]} · Matchday`
    : "Compare players · Matchday";
}

/* ---------- events ---------- */
selectA.addEventListener("change", () => {
  aId = validId(selectA.value);
  if (aId === bId) {
    bId = "";
    selectB.value = "";
    Matchday.toast("Pick a different player for the second side", { icon: "info" });
  }
  render();
});

selectB.addEventListener("change", () => {
  bId = validId(selectB.value);
  if (bId === aId) {
    bId = "";
    selectB.value = "";
    Matchday.toast("Pick a different player for the second side", { icon: "info" });
  }
  render();
});

swapButton.addEventListener("click", () => {
  const oldA = aId;
  aId = bId;
  bId = oldA;
  selectA.value = aId;
  selectB.value = bId;
  render();
});

root.addEventListener("click", (event) => {
  const suggest = event.target.closest("[data-suggest]");
  if (suggest) {
    bId = suggest.dataset.suggest;
    if (bId === aId) return;
    selectB.value = bId;
    render();
    root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
});

render();
