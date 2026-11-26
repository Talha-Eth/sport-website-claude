# Matchday — Sports Information Platform

A nine-page, responsive football website built from the IICT project proposal **“Sports Information Platform: Live Football Scores, Player Stats & Match Reminders.”**

It brings live scores, fixtures, league tables, team pages, player statistics, side-by-side player comparison and match reminders together in one consistent design — using only HTML, CSS and JavaScript.

| | |
|---|---|
| **Course** | Introduction to Information & Communication Technologies (IICT) |
| **Class** | BS(AI)-1A · 1st Semester · Fall 2026 |
| **Team** | Talha Moin (02-136262-013), Zain Khan (02-136262-031), Zaid Ahmed (02-136262-047) |
| **Deliverable** | Nine-page functional front-end prototype |

---

## Open the site

1. Double-click **`index.html`** (Chrome or Edge is recommended).
2. Everything runs locally: no build step, no server, no install, no account. Fonts are self-hosted and the dataset ships with the project, so it also works offline.

If your browser restricts `localStorage` for `file://` pages (reminders would not save), run a small static server instead:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000/>. Any static server works.

---

## The nine pages

| # | Page | What it does |
|---|------|--------------|
| 1 | [Matches & Scores Hub](index.html) | Hero live match, sport/league/date filters, matches grouped as Live now, Upcoming and Finished, sidebar leagues, next reminders and top scorers. |
| 2 | [Match Detail](match/index.html?id=pl-r13-1) | Scoreboard, live minute, Summary and Player stats tabs, key-events timeline, line-ups with minutes/goals/assists/ratings, head-to-head and reminder/calendar actions. |
| 3 | [Leagues & Sports](leagues/index.html) | Sport chips, league browser, next fixtures, latest results, top scorers and a computed standings table with form, goals and points. |
| 4 | [Team Page](team/index.html?id=arsenal) | Club header, season summary, next fixture with countdown and reminder, recent results, league position, top scorers, club details and a full squad table. |
| 5 | [Players](players/index.html) | 560 players in a searchable, filterable (league/team/position) sortable table with pagination; tick two players to compare. |
| 6 | [Player Profile](player/index.html?id=arsenal-p7) | Player header, season totals, appearances with ratings, rating trend chart, player details, next team fixture and compare picker. |
| 7 | [Compare Players](compare/index.html) | Two player pickers, swap, side-by-side cards and season totals with bars that highlight the higher value in every row. |
| 8 | [My Reminders](reminders/index.html) | Saved reminders with live countdowns, email or on-site delivery, remove/undo, email address and reminder lead-time settings. No account needed. |
| 9 | [About & Contact](about/index.html) | Project purpose, feature summary, all nine pages, team members, IICT concepts, data credits and a validated contact form. |

Every page shares the same header/navigation, global search, theme switch, reminder bell and footer.

---

## What is fully functional

- **Navigation and layout** — all nine pages are connected; every link resolves; responsive from ~360 px phones to wide desktop screens.
- **Live simulation** — live matches tick forward one simulated minute every 30 seconds (persisted for the browser session). The hero spotlight, scoreboards, badges and match-info panel stay in sync.
- **Search** — the header search looks through players, clubs, leagues and matches, with keyboard navigation (`/` to focus, arrows + Enter, Esc to close). Typing also filters the Hub and Players tables.
- **Filters and sorting** — sport/league/date filters on the Hub; league/team/position filters on Players; sortable columns with `aria-sort`; pagination with page numbers and “showing 1–12 of 560”.
- **Comparison flow** — tick exactly two players on the Players page, then open Compare Players. Selection is kept in `sessionStorage`. The compare page supports one-click swap and highlights the higher value in each stat.
- **Reminders** — add a reminder from any upcoming match (Hub, Match Detail, Team, Leagues or Player pages), see it in the bell counter and on My Reminders, set delivery per match, change the email/lead-time settings, remove with Undo. All stored in `localStorage` — no login.
- **Tabs** — Match Detail (Summary / Player stats), Team (Overview / Squad / Fixtures) and Leagues (Fixtures & results / Standings) are keyboard accessible.
- **Search-friendly URLs** — filters such as `?league=47`, `?team=arsenal`, `?id=pl-r13-1`, `?sort=goals`, `?a=…&b=…` are reflected in the address bar and can be shared.
- **Theme** — light/dark toggle, remembered in `localStorage`, respects the operating-system preference on first visit.
- **Forms** — contact form validation with inline errors and a success state; reminder settings validation.
- **Accessibility basics** — skip link, semantic landmarks, visible focus states, labelled controls, `aria-current`, `aria-sort`, `aria-selected`, live regions on the toast host, reduced-motion support.

---

## Demo data

The proposal calls for a free football API later; this prototype ships a **deterministic sample dataset** so every page can be demonstrated without a data subscription.

- 5 leagues: Premier League, LaLiga, Serie A, Bundesliga, Ligue 1
- 40 clubs and **560 players** (14 per club)
- **280 fixtures** across 14 matchweeks: 240 finished, 5 live, 35 upcoming
- Simulated goals, assists, cards, attendances, line-ups and player ratings
- Kick-off times are shifted to the current session, so the Live, Upcoming and Finished groups always make sense whenever the demo is opened
- Standings, form, top scorers, minutes and average ratings are all **computed from the match events and line-ups** in `assets/js/store.js`, so every page agrees

Club names and stadiums are real; **players, scores and statistics are invented for the project** and labelled “Demo data” throughout the site. No official club artwork is used — the crests are original SVG-style monograms that use club colours.

### Regenerate the dataset

The data files in `data/` were generated by [`tools/generate_data.py`](tools/generate_data.py). If you edit the generator (or want a fresh season), run:

```powershell
python tools/generate_data.py
```

That rewrites:

- `data/matches-data.js` — leagues + fixtures with goal/card events
- `data/teams-data.js` — clubs, stadiums, colours
- `data/players-data.js` — squads with positions, nationalities and traits

### Data files and the shared stat engine

| File | Role |
|------|------|
| [`data/matches-data.js`](data/matches-data.js) | `window.MATCHDAY_DATA`: leagues, fixtures, events |
| [`data/teams-data.js`](data/teams-data.js) | `window.MATCHDAY_TEAMS`: 40 clubs |
| [`data/players-data.js`](data/players-data.js) | `window.MATCHDAY_PLAYERS`: 560 players |
| [`assets/js/store.js`](assets/js/store.js) | Indexes the data, builds line-ups, calculates season totals, standings, form, top scorers and search |
| [`assets/js/common.js`](assets/js/common.js) | Shared chrome, theme, search, reminders, toasts, icons, live ticker |

---

## Reminder behaviour — what is real and what is simulated

Real and working in this prototype:

- saving/removing reminders in `localStorage`
- the bell count
- per-match delivery choice (email / on-site)
- email address + lead-time settings
- live countdowns
- on-site notification toasts when an on-site reminder falls inside its lead time (while on the Hub or Reminders page)
- Undo after remove

Simulated, because the project must stay on free tools and has no back end:

- actual email delivery
- browser push notifications
- contact-form delivery (messages are saved in `localStorage` for the demo)

The UI clearly notes this on the About and Reminders pages.

---

## Project structure

```text
index.html                 Matches & Scores Hub
home.js
match/                     Match Detail
leagues/                   Leagues & Sports
team/                      Team Page
players/                   Players
player/                    Player Profile
compare/                   Compare Players
reminders/                 My Reminders
about/                     About & Contact
assets/
  css/theme.css            Design system + all page layouts
  css/fonts.css            Self-hosted @font-face rules
  fonts/                   Barlow + Barlow Condensed woff2
  img/favicon.svg
  js/common.js             Header/footer, theme, search, reminders, toast, live ticker
  js/store.js              Data + computed statistics
data/                      Sample dataset (generated)
tools/                     Data generator, fonts downloader and QA scripts
README.md
```

The original starter files (`index.html`, `home.js`, `assets/css/theme.css`, `assets/js/common.js`, `data/matches-data.js`) were kept and extended; the empty page folders became the other eight pages.

### Design system

All colours, typography, spacing, cards, buttons, tables, badges and responsive rules live in [`assets/css/theme.css`](assets/css/theme.css). Changing the variables in `:root` restyles the entire site. Dark mode is a second token set under `[data-theme="dark"]`.

Fonts are downloaded once by [`tools/fetch_fonts.js`](tools/fetch_fonts.js) and served from `assets/fonts/`, so there is no dependency on Google Fonts at runtime.

---

## QA and validation

These scripts are development tools; they are not needed to run the site.

```powershell
# data + calculated statistics consistency
node tools/check_data.js

# links, assets, scripts, duplicate ids, local fonts
node tools/check_site.js

# headless interaction tests (Chrome required)
node tools/test_flows.js
```

Screenshots can be captured with `tools/screenshot.js`; it uses the Chrome DevTools Protocol, so it also supports true mobile viewports and dark mode. Set `CHROME_PATH` if Chrome is installed somewhere else.

The data checker validates that every goal event is attributed to a player in the right squad, scores match goal events, line-up goals match scores, standings points are consistent and every player has a computed season total.

---

## Known limitations

- Live scores, minutes, line-ups and ratings are a deterministic demo simulation; they are not a live feed.
- Email reminders and the contact form have no back end. (The proposal’s free email service/API would replace this in the next phase.)
- The dataset covers a partial season (14 matchweeks) rather than a complete real-world calendar.
- No user accounts by design — the proposal explicitly keeps login, subscriptions, streaming, betting and forums out of scope.

---

## Credits

- **Project, design and code:** Talha Moin, Zain Khan, Zaid Ahmed.
- **Data:** sample dataset generated for this project; club and stadium names are factual, all results and player statistics are simulated.
- **Live data plan:** free football API such as football-data.org or API-Football (next phase).
- **Type:** Barlow and Barlow Condensed (SIL Open Font License), self-hosted.
- **Icons and crests:** inline SVG drawn for this project.

Built for the IICT course, Fall 2026.
