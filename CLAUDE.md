# College Hoops Throwdown — Project Reference

## Local Development
Always run the game via the local server, not by opening files directly.
Start the server: npm start  (uses npx serve . -p 8080)
Then open: http://localhost:8080/index.html
fetch() calls (data/data.json, etc.) are blocked on file:// protocol.

---

## What this is
A browser-based college basketball simulation game. No build pipeline —
plain HTML/JS/CSS, designed to run on GitHub Pages. All game logic runs
client-side; localStorage is the only persistence layer.

---

## User-facing files

| File | Purpose |
|---|---|
| `index.html` | Main game — team selection, game play, box score display |
| `season.html` | Season mode — team selection, schedule, standings, sim/play handoff |
| `stats.html` | Stats dashboard — standings, team/player averages, strategy report |

## Dev / tooling files (not part of the user-facing game)

| File | Purpose |
|---|---|
| `simulate.html` | **Dev-only test harness.** Runs CPU-vs-CPU simulations in bulk to tune game balance. Not linked from the main menu. |
| `migrate.js` | Node.js pipeline: reads `import/` source files, writes `data/` output files |
| `set_ratings.py` | CLI: set net_rating on a team in `data/ratings.json` + `data/teams.json` |
| `check_data.py` | Data integrity checker — exits 0 (pass) or 1 (fail) |
| `extract_ratings.js` | Browser console scraper for sports-reference.com net ratings |
| `import/extract_team.js` | Browser console scraper for individual team/player data |
| `debug.js` | Browser console helper (`CHT_Debug`) — load manually, not imported by app |

## Shared JS modules (loaded via `<script src="...">`)

| File | Loaded by | Purpose |
|---|---|---|
| `store.js` | index.html, season.html, simulate.html | `window.Store` — localStorage wrapper (`get`, `set`, `del`, `keys`) |
| `boxscore.js` | index.html, season.html, simulate.html | `window.BoxScore` — game record logging and localStorage persistence |
| `game_engine_sim.js` | index.html, season.html, simulate.html | `window.GameEngineSim` — **shared simulation core.** All simulation logic lives here. Exposes `runOneGame`, `G` (getter), `pbp` (getter). Wrapped in IIFE to avoid global conflicts with index.html. |
| `cpu_sim.js` | index.html, season.html | `window.CpuSim` — wraps `GameEngineSim.runOneGame()` for season CPU games. Returns structured result; optionally calls `BoxScore.saveFromSim()`. |
| `stats_engine.js` | index.html, stats.html | `window.StatsEngine` — read-only aggregation over stored box scores |
| `season_engine.js` | index.html, season.html | `window.SeasonEngine` — season creation, scheduling, and state management |

---

## Data files

| File | Purpose |
|---|---|
| `data/data.json` | **v2 format:** `{ meta, conferences[], teams[] }`. Authoritative source for stats.html and future fetch migration. |
| `data/teams.json` | Flat teams array with embedded players (used by set_ratings.py) |
| `data/conferences.json` | Conference lookup (used by check_data.py) |
| `data/players.json` | Flat diagnostic player list |
| `data/ratings.json` | Net ratings — survives `migrate.js` reruns. Edit with `set_ratings.py`. |

---

## Key architectural decisions

### Data embedded inline vs. fetched
`index.html` currently embeds team data inline as `const DATA = [...]` (v1 format,
conference-nested). The fetch migration to `data/data.json` (Phase 1) is planned but
not yet complete. `stats.html` already uses `fetch('data/data.json')`.

### localStorage key namespaces
```
game:{seasonId}:{gameId}     — box score records (written by BoxScore.save)
season:active                — current active season object (SeasonEngine)
season:{id}:meta             — season object by seasonId (persists after completion)
tournament:{id}:*            — active tournament bracket (future)
settings:*                   — user preferences (e.g. settings:userTeamId)
history:*                    — completed season/tournament summaries (future)
```

### Box score teamId
`BoxScore.save` sets `teamId = teamObj.id || teamObj.name`. The game engine's
`ge_buildTeam` does not carry through the team's slug `id`, so in practice
`teamId` equals the team's display name (e.g. `"Arizona"`). This means conference
filtering in stats.html must match by `teamName`, not the slug from `data.json`
`memberIds`. Fix: add `id` to the object returned by `ge_buildTeam`.

### Log levels
`BoxScore.LOG_LEVELS`:
- `OFF` (0) — no data saved (used in all current exhibition games and simulate.html)
- `SUMMARY` (1) — score/stats saved, no PBP (planned for season/tournament CPU games)
- `FULL` (2) — complete PBP + strategyLog saved (planned for user-played season games)

`strategyReport` in StatsEngine only produces data for `FULL` box scores.

### StatsEngine.strategyReport point-delta reconstruction
`BoxScore.logStrategyChange` stores `homeScore`/`awayScore` at each strategy boundary.
`strategyReport` computes span point deltas as `endScore - startScore` using these
stored values, with `g.home.score`/`g.away.score` as the terminal value for the last
span. `_extractScore` has been removed.

### Play game handoff (season.html → index.html)

`season.html` hands off a game to `index.html` via a Store key:

```javascript
Store.set('season:pending_game', {
  gameIndex,      // slot index in season.schedule
  homeTeamId,     // team slug (e.g. 'illinois')
  awayTeamId,
  seasonId,
  userTeamId,     // which side the user controls
});
// then: window.location.href = 'index.html';
```

On load, `index.html` checks for `season:pending_game`, clears it immediately, pre-selects
teams, sets `G.pendingSeasonGame`, and skips to the setup screen. At game end, `showNext()`
calls `SeasonEngine.recordResult(gameIndex, {homeScore, awayScore, winnerId, method:'played',
gameId})` and replaces the quit button with a "← Return to Season" link.

Season games log at `BoxScore.LOG_LEVELS.FULL`. CPU-simulated season games call
`BoxScore.saveFromSim()` via `CpuSim.simulateGame()`.

### season_engine.js schedule builder

**SCHEDULE BUILDER NOTES**
- Conference balance: opponents split into home/away groups from round-robin. Rematches
  drawn from opposing group to guarantee exactly 9 home / 9 away for every conference
  size. Do not replace this with a shuffle-based approach.
- Sequencing: `sequenceBlock()` handles both non-conf and conf blocks. Shuffles home/away
  lists independently, interleaves starting home, max-2-consecutive enforced as hard
  constraint.
- `complete()` reads W-L from `season.schedule` directly — do not refactor to call
  `getUserRecord()` since `season:active` is already deleted at that point.

### Conference standings data flow

Dates are display strings from a fixed 30-element `GAME_DATES` array — no `Date` object
parsing anywhere in scheduling or simulation. Game slot at index `i` always gets
`GAME_DATES[i]`.

```
season.html renderDashboard()
  → renderStandings(season)
      → SeasonEngine.getConferenceStandings(season.currentGame)
          → simulateToIndex(gameIndex)
               [per-team: combined = 12 nonConf + 18 conf = 30 games
                slice(0, gameIndex); skip pending user games; simulate rest]
          → scans conf_schedule results + user's personal schedule
          → returns rows[] sorted by confWins DESC
               { teamId, teamName, confWins, confLosses, confWinPct,
                 ovWins, ovLosses, ovr: "W-L", conf: "W-L", diff, gp, … }
```

Key index fields:
- User schedule slots: `gameIndex` 0–29 (absolute position, equals GAME_DATES index)
- Master conf schedule: `roundIndex` 12–29 (absolute GAME_DATES index)
- Master non-conf schedule: `gameIndex` 0–11 (absolute GAME_DATES index)

`simulateToIndex(30)` is called after "Simulate Rest of Season" and inside `complete()`
to ensure all other-team games are resolved. The per-team combined array is always 30
games (12 nonConf + 18 conf); `slice(0, gameIndex)` keeps every team's resolved count
exactly equal to the user's. Including user games in the conf array (rather than
excluding them) prevents confGP imbalance when the user has played some conf games.

`complete()` also saves `season:{id}:final_standings` to localStorage so the
season-complete page in season.html and stats.html can display standings without
an active session.

`simulateToIndex` is a no-op when `window.CpuSim` is undefined (stats.html context).

---

## Development workflow

```bash
# After editing import/ source files:
node migrate.js

# Set a team's net rating:
python set_ratings.py arizona 24.5

# Verify data integrity:
python check_data.py

# Scrape fresh ratings from sports-reference.com:
# Open extract_ratings.js in browser DevTools console
```
