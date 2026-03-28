// boxscore.js
// Defines window.BoxScore — game record logging and localStorage persistence.
// Depends on window.Store (defined in index.html before the DATA block).
// Load this file before index.html's game engine script block.

window.BoxScore = (() => {

  // ── Log levels ──────────────────────────────────────────────────────────────
  const LOG_LEVELS = { OFF: 0, SUMMARY: 1, FULL: 2 };

  // ── Private state ───────────────────────────────────────────────────────────
  let _logLevel        = LOG_LEVELS.OFF;
  let _homeTeam        = null;
  let _awayTeam        = null;
  let _context         = 'exhibition';
  let _seasonId        = null;
  let _strategyLog     = [];   // in-memory, flushed on save()
  let _initStrategies  = null; // starting strategies captured at init time
  let _saved           = false; // guard: prevent double-save per game

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatClock(seconds) {
    const m = Math.floor(seconds / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  // Sum a stat field across all players in a stats map (keyed by player name)
  function sumStat(statsMap, field) {
    return Object.values(statsMap).reduce((n, s) => n + (s[field] || 0), 0);
  }

  // Build the player rows array for one side from the team object and stats map
  function buildPlayerRows(teamObj, statsMap, playerStateMap) {
    const allPlayers = teamObj.allPlayers || [...(teamObj.lineup || []), ...(teamObj.bench || [])];
    const rows = [];
    for (const p of allPlayers) {
      const s = statsMap[p.name];
      if (!s) continue;
      // Only include players who actually saw the floor (have a minute count)
      const secs = playerStateMap && playerStateMap[p.name] != null
        ? (playerStateMap[p.name].totalGameSecs || 0)
        : (p.totalGameSecs || 0);
      if (Math.round(secs / 60) === 0) continue;
      rows.push({
        name: p.name,
        min:  Math.round(secs / 60),
        pts:  s.pts  || 0,
        reb:  s.reb  || 0,
        ast:  s.ast  || 0,
        stl:  s.stl  || 0,
        blk:  s.blk  || 0,
        to:   s.tov  || 0,
        pf:   s.pf   || 0,
        fgm:  s.fgm  || 0,
        fga:  s.fga  || 0,
        '3pm': s.tpm || 0,
        '3pa': s.tpa || 0,
        ftm:  s.ftm  || 0,
        fta:  s.fta  || 0,
      });
    }
    return rows.sort((a, b) => b.pts - a.pts);
  }

  // Build team totals from the stats map
  function buildTeamTotals(statsMap) {
    return {
      fg:  sumStat(statsMap, 'fgm'),
      fga: sumStat(statsMap, 'fga'),
      '3p':  sumStat(statsMap, 'tpm'),
      '3pa': sumStat(statsMap, 'tpa'),
      ft:  sumStat(statsMap, 'ftm'),
      fta: sumStat(statsMap, 'fta'),
      reb: sumStat(statsMap, 'reb'),
      ast: sumStat(statsMap, 'ast'),
      stl: sumStat(statsMap, 'stl'),
      blk: sumStat(statsMap, 'blk'),
      to:  sumStat(statsMap, 'tov'),
      pf:  sumStat(statsMap, 'pf'),
    };
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  function init(homeTeam, awayTeam, context, seasonId, logLevel,
                homeOffense, homeDefense, awayOffense, awayDefense) {
    _homeTeam   = homeTeam;
    _awayTeam   = awayTeam;
    _context    = context  || 'exhibition';
    _seasonId   = seasonId || null;
    _logLevel   = (logLevel !== undefined && logLevel !== null)
                    ? logLevel
                    : LOG_LEVELS.OFF;
    _strategyLog    = [];
    _initStrategies = { homeOffense, homeDefense, awayOffense, awayDefense };
    _saved          = false;
  }

  function save(eventQueue) {
    if (_logLevel === LOG_LEVELS.OFF) return;
    if (_saved) return;
    _saved = true;

    // ── Resolve Store ────────────────────────────────────────────────────────
    const _Store = (typeof Store !== 'undefined' ? Store : window.Store);
    if (!_Store) { console.warn('[CHT] BoxScore.save: Store not available'); return; }

    // ── Find last snapshot ───────────────────────────────────────────────────
    let snap = null;
    for (let i = eventQueue.length - 1; i >= 0; i--) {
      if (eventQueue[i] && eventQueue[i].snapshot) { snap = eventQueue[i].snapshot; break; }
    }
    if (!snap) { console.warn('[CHT] BoxScore.save: no valid snapshot found in eventQueue'); return; }

    const homeScore = snap.homeScore;
    const awayScore = snap.awayScore;
    const stats     = snap.stats      || {};
    const pstate    = snap.playerState || {};

    // ── Build side data ──────────────────────────────────────────────────────
    function buildSide(teamObj, score) {
      return {
        teamId:   teamObj.id   || teamObj.name,
        teamName: teamObj.name,
        score,
        stats:   buildTeamTotals(stats),
        players: buildPlayerRows(teamObj, stats, pstate),
      };
    }

    const gameId = 'g_' + Date.now();

    const boxScore = {
      gameId,
      date:      todayStr(),
      context:   _context,
      seasonId:  _seasonId,
      home:      buildSide(_homeTeam, homeScore),
      away:      buildSide(_awayTeam, awayScore),
      winner:    homeScore > awayScore ? (_homeTeam.id || _homeTeam.name)
               : awayScore > homeScore ? (_awayTeam.id || _awayTeam.name)
               : null,
      strategyLog: null,
      pbp:         null,
    };

    // ── FULL only: strategy log ──────────────────────────────────────────────
    if (_logLevel === LOG_LEVELS.FULL) {
      const firstEntry = {
        time:         '20:00',
        half:         1,
        homeOffense:  _initStrategies.homeOffense,
        homeDefense:  _initStrategies.homeDefense,
        awayOffense:  _initStrategies.awayOffense,
        awayDefense:  _initStrategies.awayDefense,
        homeScore:    0,
        awayScore:    0,
      };
      boxScore.strategyLog = [firstEntry, ..._strategyLog];

      // ── FULL only: PBP (snapshots stripped) ─────────────────────────────
      const SKIP_TYPES = new Set(['halftime', 'media_timeout', 'strategy_change']);
      boxScore.pbp = eventQueue
        .filter(ev => ev && ev.text && !SKIP_TYPES.has(ev.type))
        .map(ev => ({
          text:  ev.text,
          clock: ev.snapshot ? ev.snapshot.clock : null,
          half:  ev.snapshot ? ev.snapshot.half  : null,
          type:  ev.type,
        }));
    }

    // ── Persist ──────────────────────────────────────────────────────────────
    const key     = `game:${_seasonId || 'exhibition'}:${gameId}`;
    const jsonStr = JSON.stringify(boxScore);
    _Store.set(key, boxScore);

    const levelName = _logLevel === LOG_LEVELS.FULL ? 'FULL' : 'SUMMARY';
    console.log(
      `[CHT] Box score saved (${levelName}): ` +
      `${_awayTeam.name} ${awayScore} @ ${_homeTeam.name} ${homeScore} — ${jsonStr.length} chars`
    );

    // Reset in-memory strategy log
    _strategyLog = [];

    return gameId;
  }

  function logStrategyChange(clock, half, homeOffense, homeDefense, awayOffense, awayDefense, homeScore, awayScore) {
    if (_logLevel !== LOG_LEVELS.FULL) return;
    _strategyLog.push({
      time:  formatClock(clock),
      half,
      homeOffense,
      homeDefense,
      awayOffense,
      awayDefense,
      homeScore: homeScore || 0,
      awayScore: awayScore || 0,
    });
  }

  // ── BoxScore.saveFromSim ─────────────────────────────────────────────────────
  //
  // Saves a completed simulation result (from CpuSim) directly as a box score record.
  // Does not use the in-memory _logLevel / _strategyLog pipeline — always persists.
  //
  // homePlayers / awayPlayers: arrays of player row objects in BoxScore format
  //   (fields: name, min, pts, reb, ast, stl, blk, to, pf, fgm, fga, 3pm, 3pa, ftm, fta)
  //
  // Returns the generated gameId string.

  function saveFromSim(homeTeam, awayTeam, homeScore, awayScore,
                       homePlayers, awayPlayers, seasonId, context) {
    const _Store = (typeof Store !== 'undefined' ? Store : window.Store);
    if (!_Store) { console.warn('[CHT] BoxScore.saveFromSim: Store not available'); return null; }

    function simTotals(players) {
      const t = { fg:0, fga:0, '3p':0, '3pa':0, ft:0, fta:0,
                  reb:0, ast:0, stl:0, blk:0, to:0, pf:0 };
      for (const p of players) {
        t.fg   += p.fgm  || 0;
        t.fga  += p.fga  || 0;
        t['3p']  += p['3pm'] || 0;
        t['3pa'] += p['3pa'] || 0;
        t.ft   += p.ftm  || 0;
        t.fta  += p.fta  || 0;
        t.reb  += p.reb  || 0;
        t.ast  += p.ast  || 0;
        t.stl  += p.stl  || 0;
        t.blk  += p.blk  || 0;
        t.to   += p.to   || 0;
        t.pf   += p.pf   || 0;
      }
      return t;
    }

    const gameId = 'g_' + Date.now();
    const ctx    = context  || 'exhibition';
    const sid    = seasonId || null;

    const boxScore = {
      gameId,
      date:      todayStr(),
      context:   ctx,
      seasonId:  sid,
      home: {
        teamId:   homeTeam.id   || homeTeam.name,
        teamName: homeTeam.name,
        score:    homeScore,
        stats:    simTotals(homePlayers),
        players:  homePlayers.slice().sort((a, b) => b.pts - a.pts),
      },
      away: {
        teamId:   awayTeam.id   || awayTeam.name,
        teamName: awayTeam.name,
        score:    awayScore,
        stats:    simTotals(awayPlayers),
        players:  awayPlayers.slice().sort((a, b) => b.pts - a.pts),
      },
      winner: homeScore > awayScore ? (homeTeam.id || homeTeam.name)
            : awayScore > homeScore ? (awayTeam.id || awayTeam.name)
            : null,
      strategyLog: null,
      pbp:         null,
    };

    const key = `game:${sid || 'exhibition'}:${gameId}`;
    _Store.set(key, boxScore);

    console.log(
      `[CHT] Box score saved (SUMMARY/SIM): ` +
      `${awayTeam.name} ${awayScore} @ ${homeTeam.name} ${homeScore}`
    );

    return gameId;
  }

  // ── Purge methods ────────────────────────────────────────────────────────────

  function purgeDetail(seasonId) {
    const prefix = `game:${seasonId}:`;
    const keys   = Store.keys(prefix);
    for (const key of keys) {
      const record = Store.get(key);
      if (record) {
        record.pbp = null;
        Store.set(key, record);
      }
    }
    console.log(`[CHT] Purged PBP detail for ${keys.length} games in season ${seasonId}`);
  }

  function purgeAll(seasonId) {
    const prefix = `game:${seasonId}:`;
    const keys   = Store.keys(prefix);
    for (const key of keys) Store.del(key);
    console.log(`[CHT] Purged all ${keys.length} game records for season ${seasonId}`);
  }

  // ── Storage report ───────────────────────────────────────────────────────────

  function storageReport() {
    const BUDGET_KB = 5120;
    const allKeys   = Object.keys(localStorage);

    // Group keys by namespace
    const groups = {};

    for (const key of allKeys) {
      let group;
      if (key.startsWith('game:')) {
        // Separate by seasonId: "game:exhibition" or "game:<seasonId>"
        const parts = key.split(':');  // ['game', seasonId, gameId]
        group = `game:${parts[1] || 'unknown'}`;
      } else if (key.startsWith('season:')) {
        group = 'season:*';
      } else if (key.startsWith('tournament:')) {
        group = 'tournament:*';
      } else if (key.startsWith('settings:')) {
        group = 'settings:*';
      } else {
        group = 'other';
      }
      if (!groups[group]) groups[group] = { keys: [], bytes: 0 };
      const val = localStorage.getItem(key) || '';
      groups[group].keys.push(key);
      groups[group].bytes += val.length;
    }

    let totalBytes = 0;
    for (const g of Object.values(groups)) totalBytes += g.bytes;

    console.log('[CHT] localStorage usage report');
    console.log('  ' + '-'.repeat(52));
    for (const [name, g] of Object.entries(groups).sort()) {
      const isGameGroup = name.startsWith('game:');
      const countLabel  = isGameGroup ? `${g.keys.length} games` : `${g.keys.length} keys`;
      console.log(`  ${name.padEnd(28)} ${countLabel.padStart(10)}  ${(g.bytes / 1024).toFixed(1)} KB`);
    }
    console.log('  ' + '-'.repeat(52));
    console.log(
      `  ${'TOTAL'.padEnd(28)} ${String(allKeys.length + ' keys').padStart(10)}  ` +
      `${(totalBytes / 1024).toFixed(1)} KB of ~${BUDGET_KB} KB browser budget`
    );
  }

  // ── Expose LOG_LEVELS for callers ────────────────────────────────────────────
  return { LOG_LEVELS, init, save, saveFromSim, logStrategyChange, purgeDetail, purgeAll, storageReport };

})();
