/* ============================================================
   players.js - Page 5, Players.
   A searchable, filterable, sortable and paginated table of
   every player. Tick two players to open the comparison page.
   ============================================================ */
const PAGE_SIZE = 12;
const COMPARE_KEY = "matchday.compare";
const SORT_FIELDS = ["name", "team", "position", "played", "goals", "assists", "rating"];
const POSITIONS = { Goalkeeper: 1, Defender: 2, Midfielder: 3, Forward: 4 };

const leagueParam = Matchday.param("league");
const teamParam = Matchday.param("team");
const sortParam = Matchday.param("sort");
const dirParam = Matchday.param("dir");

const state = {
  q: Matchday.param("q"),
  league: Store.league(leagueParam) ? String(leagueParam) : "all",
  team: Store.team(teamParam) ? teamParam : "all",
  position: POSITIONS[Matchday.param("position")] ? Matchday.param("position") : "all",
  sort: SORT_FIELDS.includes(sortParam) ? sortParam : "goals",
  dir: dirParam === "asc" || dirParam === "desc"
    ? dirParam
    : (SORT_FIELDS.includes(sortParam) && ["name", "team", "position"].includes(sortParam) ? "asc" : "desc"),
  page: Math.max(1, Number(Matchday.param("page")) || 1),
  selected: new Set(),
};

try {
  const saved = JSON.parse(sessionStorage.getItem(COMPARE_KEY) || "[]");
  saved.filter((id) => Store.player(id)).slice(0, 2).forEach((id) => state.selected.add(id));
} catch (e) { /* ignore broken session data */ }

const tableRoot = document.getElementById("players-table");
const compareBar = document.getElementById("compare-bar");

/* ---------- filter menus ---------- */
function fillLeagues() {
  document.getElementById("player-league").innerHTML = `<option value="all">All leagues</option>`
    + Store.leagues.map((league) => `<option value="${league.id}" ${String(league.id) === state.league ? "selected" : ""}>${Matchday.esc(league.name)}</option>`).join("");
}

function fillTeams() {
  const select = document.getElementById("player-team");
  const leagues = state.league === "all"
    ? Store.leagues
    : Store.leagues.filter((league) => String(league.id) === state.league);
  select.innerHTML = `<option value="all">All teams</option>`
    + leagues.map((league) => {
      const teams = Store.teamsInLeague(league.id).slice().sort((a, b) => a.name.localeCompare(b.name));
      return `<optgroup label="${Matchday.esc(league.name)}">${teams.map((team) =>
        `<option value="${team.id}" ${team.id === state.team ? "selected" : ""}>${Matchday.esc(team.name)}</option>`).join("")}</optgroup>`;
    }).join("");
  if (state.team !== "all" && !select.querySelector(`option[value="${state.team}"]`)) {
    state.team = "all";
    select.value = "all";
  }
}

function fillPositions() {
  document.getElementById("player-position").value = state.position;
}

/* ---------- filtering and sorting ---------- */
function playerRows() {
  const q = state.q.trim().toLowerCase();
  return Store.players
    .filter((player) => {
      if (state.league !== "all" && String(player.leagueId) !== state.league) return false;
      if (state.team !== "all" && player.teamId !== state.team) return false;
      if (state.position !== "all" && player.position !== state.position) return false;
      if (q) {
        const haystack = `${player.name} ${player.team ? player.team.name : ""} ${player.nationality}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    })
    .map((player) => ({ player, stats: Store.playerSeason(player.id) }));
}

const VALUE_OF = {
  name: (row) => row.player.name,
  team: (row) => row.player.team.name,
  position: (row) => POSITIONS[row.player.position] || 9,
  played: (row) => row.stats.played,
  goals: (row) => row.stats.goals,
  assists: (row) => row.stats.assists,
  rating: (row) => row.stats.avgRating,
};

function sortRows(rows) {
  const direction = state.dir === "asc" ? 1 : -1;
  const valueOf = VALUE_OF[state.sort] || VALUE_OF.goals;
  return rows.slice().sort((a, b) => {
    const aValue = valueOf(a);
    const bValue = valueOf(b);
    let result = 0;
    if (typeof aValue === "string") result = aValue.localeCompare(bValue);
    else result = Number(aValue) - Number(bValue);
    if (result === 0) result = a.player.name.localeCompare(b.player.name);
    return result * direction;
  });
}

/* ---------- table markup ---------- */
function header(key, label, align = "") {
  const active = state.sort === key;
  const aria = active ? (state.dir === "asc" ? "ascending" : "descending") : "none";
  return `<th scope="col" class="${align}" aria-sort="${aria}">
    <button class="sort-btn ${active ? `is-${state.dir}` : ""}" type="button" data-sort="${key}">
      ${label} ${Matchday.icon("chevronDown")}
    </button>
  </th>`;
}

function ratingCell(rating) {
  return rating
    ? `<span class="rating ${Matchday.ratingClass(rating)}">${rating.toFixed(1)}</span>`
    : `<span class="muted">—</span>`;
}

function render() {
  const all = sortRows(playerRows());
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const visible = all.slice(start, start + PAGE_SIZE);

  if (!all.length) {
    tableRoot.innerHTML = Matchday.emptyState({
      iconName: "users",
      title: "No players found",
      text: "Try a different name, league, team or position. The full database covers 560 players across five leagues.",
      ctaLabel: "Reset filters",
      ctaId: "empty-reset",
    });
    const reset = document.getElementById("empty-reset");
    if (reset) reset.addEventListener("click", resetFilters);
  } else {
    tableRoot.innerHTML = `
      <div class="table-wrap">
        <table class="data-table player-table">
          <caption class="sr-only">Players with season statistics. Use the column buttons to sort.</caption>
          <thead>
            <tr>
              <th scope="col" class="check-cell"><span class="sr-only">Compare</span></th>
              <th scope="col" class="num">#</th>
              ${header("name", "Player")}
              ${header("team", "Team")}
              ${header("position", "Pos")}
              ${header("played", "Apps", "num")}
              ${header("goals", "Goals", "num")}
              ${header("assists", "Assists", "num")}
              ${header("rating", "Rating", "num")}
            </tr>
          </thead>
          <tbody>
            ${visible.map(({ player, stats }, index) => {
              const checked = state.selected.has(player.id);
              return `<tr data-player-row="${player.id}" class="${checked ? "is-selected" : ""}">
                <td class="check-cell">
                  <input class="player-select" type="checkbox" data-player="${player.id}"
                    aria-label="Select ${Matchday.esc(player.name)} for comparison" ${checked ? "checked" : ""}>
                </td>
                <td class="num muted">${start + index + 1}</td>
                <td>
                  <a class="table-player" href="${Matchday.url.player(player.id)}">
                    ${Matchday.avatar(player, "sm")}
                    <span><span class="player-name">${Matchday.esc(player.name)}</span>
                    <span class="player-meta">${Matchday.esc(player.nationality)} · ${player.age} · ${Matchday.esc(player.team.short)}</span></span>
                  </a>
                </td>
                <td><a class="table-team" href="${Matchday.url.team(player.team.id)}">${Matchday.crest(player.team, "xs")}<span>${Matchday.esc(player.team.name)}</span></a></td>
                <td><span class="tag">${player.positionCode}</span></td>
                <td class="num">${stats.played}</td>
                <td class="num">${stats.goals}</td>
                <td class="num">${stats.assists}</td>
                <td class="num">${ratingCell(stats.avgRating)}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      ${pagerMarkup(all.length, totalPages, start, visible.length)}`;
  }

  document.getElementById("players-count").textContent = all.length
    ? `${all.length} player${all.length === 1 ? "" : "s"} · showing ${start + 1}–${start + visible.length}`
    : "No players match the current filters";
  renderCompareBar();
  syncUrl();
}

function pagerMarkup(total, totalPages, start, visibleCount) {
  if (totalPages <= 1) {
    return `<p class="pager-info">Showing all ${total} players</p>`;
  }
  const pages = new Set([1, totalPages, state.page - 1, state.page, state.page + 1]);
  if (state.page <= 3) [2, 3, 4].forEach((page) => pages.add(page));
  if (state.page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((page) => pages.add(page));
  const sorted = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  let previous = 0;
  const numberButtons = sorted.map((page) => {
    const gap = page - previous > 1 ? `<span class="pager-gap">…</span>` : "";
    previous = page;
    return `${gap}<button type="button" data-goto="${page}" class="${page === state.page ? "is-active" : ""}"
      aria-label="Page ${page}" ${page === state.page ? 'aria-current="page"' : ""}>${page}</button>`;
  }).join("");
  return `<div class="pager">
      <button type="button" data-goto="${state.page - 1}" ${state.page === 1 ? "disabled" : ""} aria-label="Previous page">←</button>
      ${numberButtons}
      <button type="button" data-goto="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""} aria-label="Next page">→</button>
    </div>
    <p class="pager-info">Page ${state.page} of ${totalPages} · ${total} players · showing ${start + 1}–${start + visibleCount}</p>`;
}

/* ---------- comparison bar ---------- */
function selectedPlayers() {
  return [...state.selected].map((id) => Store.player(id)).filter(Boolean);
}

function renderCompareBar() {
  const selected = selectedPlayers();
  compareBar.hidden = selected.length === 0;
  if (!selected.length) return;
  document.getElementById("compare-selected").innerHTML = `
    <span class="small muted">Selected ${selected.length}/2</span>
    ${selected.map((player) => `<span class="selected-chip">
      ${Matchday.avatar(player, "xs")}
      <a href="${Matchday.url.player(player.id)}">${Matchday.esc(player.name)}</a>
      <button type="button" data-unselect="${player.id}" aria-label="Remove ${Matchday.esc(player.name)}">${Matchday.icon("close")}</button>
    </span>`).join("")}`;
  const go = document.getElementById("compare-go");
  go.disabled = selected.length !== 2;
  go.textContent = selected.length === 2 ? "Compare players" : `Select ${2 - selected.length} more`;
}

function persistSelection() {
  try {
    sessionStorage.setItem(COMPARE_KEY, JSON.stringify([...state.selected]));
  } catch (e) { /* ignore */ }
}

function toggleCompare(playerId, checked) {
  if (checked) {
    if (state.selected.size >= 2) {
      Matchday.toast("You can compare two players at a time. Remove one first.", { icon: "info" });
      const box = document.querySelector(`.player-select[data-player="${playerId}"]`);
      if (box) box.checked = false;
      return;
    }
    state.selected.add(playerId);
  } else {
    state.selected.delete(playerId);
  }
  persistSelection();
  renderCompareBar();
  const row = document.querySelector(`[data-player-row="${playerId}"]`);
  if (row) row.classList.toggle("is-selected", state.selected.has(playerId));
  const box = document.querySelector(`.player-select[data-player="${playerId}"]`);
  if (box) box.checked = state.selected.has(playerId);
}

/* ---------- url and filters ---------- */
function syncUrl() {
  Matchday.setParams({
    q: state.q || null,
    league: state.league === "all" ? null : state.league,
    team: state.team === "all" ? null : state.team,
    position: state.position === "all" ? null : state.position,
    sort: state.sort,
    dir: state.dir,
    page: state.page > 1 ? state.page : null,
  });
}

function resetFilters() {
  state.q = "";
  state.league = "all";
  state.team = "all";
  state.position = "all";
  state.sort = "goals";
  state.dir = "desc";
  state.page = 1;
  document.getElementById("player-search").value = "";
  document.getElementById("player-league").value = "all";
  fillTeams();
  document.getElementById("player-position").value = "all";
  const headerSearch = document.getElementById("site-search");
  if (headerSearch) headerSearch.value = "";
  render();
}

/* ---------- events ---------- */
document.getElementById("player-league").addEventListener("change", (event) => {
  state.league = event.target.value;
  state.team = "all";
  fillTeams();
  state.page = 1;
  render();
});

document.getElementById("player-team").addEventListener("change", (event) => {
  state.team = event.target.value;
  state.page = 1;
  render();
});

document.getElementById("player-position").addEventListener("change", (event) => {
  state.position = event.target.value;
  state.page = 1;
  render();
});

let searchTimer = null;
document.getElementById("player-search").addEventListener("input", (event) => {
  state.q = event.target.value;
  state.page = 1;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 120);
});

document.getElementById("players-reset").addEventListener("click", resetFilters);

tableRoot.addEventListener("click", (event) => {
  const sortButton = event.target.closest("[data-sort]");
  if (sortButton) {
    const key = sortButton.dataset.sort;
    if (state.sort === key) state.dir = state.dir === "asc" ? "desc" : "asc";
    else {
      state.sort = key;
      state.dir = ["name", "team", "position"].includes(key) ? "asc" : "desc";
    }
    state.page = 1;
    render();
    return;
  }
  const goto = event.target.closest("[data-goto]");
  if (goto) {
    const page = Number(goto.dataset.goto);
    if (page >= 1) {
      state.page = page;
      render();
      window.scrollTo({ top: document.getElementById("players-table").offsetTop - 90, behavior: "smooth" });
    }
  }
});

tableRoot.addEventListener("change", (event) => {
  const box = event.target.closest(".player-select");
  if (!box) return;
  toggleCompare(box.dataset.player, box.checked);
});

document.addEventListener("matchday:search", (event) => {
  state.q = event.detail || "";
  state.page = 1;
  const input = document.getElementById("player-search");
  if (input) input.value = state.q;
  render();
});

compareBar.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-unselect]");
  if (remove) {
    toggleCompare(remove.dataset.unselect, false);
    return;
  }
  if (event.target.closest("#compare-clear")) {
    state.selected.clear();
    persistSelection();
    document.querySelectorAll(".player-select").forEach((box) => { box.checked = false; });
    document.querySelectorAll("[data-player-row]").forEach((row) => row.classList.remove("is-selected"));
    renderCompareBar();
    return;
  }
  if (event.target.closest("#compare-go") && state.selected.size === 2) {
    const [a, b] = [...state.selected];
    window.location.href = Matchday.url.compare(a, b);
  }
});

/* ---------- start ---------- */
fillLeagues();
fillTeams();
fillPositions();
document.getElementById("player-search").value = state.q;
document.getElementById("player-league").value = state.league;
render();
