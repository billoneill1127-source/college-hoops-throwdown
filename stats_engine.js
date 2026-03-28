// stats_engine.js
// Defines window.StatsEngine — read-only aggregation over localStorage box scores.
// Depends on window.Store. Loaded after boxscore.js in index.html.
// All methods compute on demand from raw stored box scores; nothing is cached or mutated.

window.StatsEngine = (() => {

  // ── Data-model adapters ───────────────────────────────────────────────────────
  // Accept v2 (window.TEAMS / window.CONFERENCES) or fall back to v1 DATA format.

  function _getTeams() {
    if (window.TEAMS && Array.isArray(window.TEAMS)) return window.TEAMS;
    if (window.DATA  && Array.isArray(window.DATA))  {
      return window.DATA.flatMap(c =>
        (c.teams || []).map(t => ({ ...t, id: t.id || t.name, conference: t.conference || c.conference }))
      );
    }
    return [];
  }

  function _getConferences() {
    if (window.CONFERENCES && Array.isArray(window.CONFERENCES)) return window.CONFERENCES;
    if (window.DATA && Array.isArray(window.DATA)) {
      return window.DATA.map(c => ({
        id:        c.conference,
        name:      c.conference,
        shortName: c.conference,
        memberIds: (c.teams || []).map(t => t.id || t.name),
      }));
    }
    return [];
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  // Parse "M:SS" strategy-log time string → seconds remaining (integer).
  function _parseTime(str) {
    if (!str) return 0;
    const parts = String(str).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  }


  // ── Public helper: _getGames ─────────────────────────────────────────────────

  function _getGames(seasonId) {
    const prefix = 'game:' + seasonId + ':';
    const keys   = Store.keys(prefix);
    const games  = [];
    for (const key of keys) {
      const g = Store.get(key);
      if (g) games.push(g);
    }
    return games;
  }

  // ── Public helper: _isUserTeam ───────────────────────────────────────────────

  function _isUserTeam(teamId, userTeamId) {
    return teamId === userTeamId;
  }

  // ── StatsEngine.teamRecord ───────────────────────────────────────────────────

  function teamRecord(teamId, seasonId) {
    const games = _getGames(seasonId).filter(g =>
      g.home.teamId === teamId || g.away.teamId === teamId
    );

    let teamName  = teamId;
    let wins = 0, losses = 0;
    let homeWins = 0, homeLosses = 0;
    let awayWins = 0, awayLosses = 0;
    let confWins = 0, confLosses = 0;
    const results = []; // 'W' or 'L' in stored order (gameId timestamps are chronological)

    for (const g of games) {
      const isHome = g.home.teamId === teamId;
      const side   = isHome ? g.home : g.away;
      if (teamName === teamId) teamName = side.teamName || teamId;

      const won = g.winner === teamId;
      results.push(won ? 'W' : 'L');

      if (won) {
        wins++;
        if (isHome) homeWins++; else awayWins++;
        if (g.context === 'season') confWins++;
      } else {
        losses++;
        if (isHome) homeLosses++; else awayLosses++;
        if (g.context === 'season') confLosses++;
      }
    }

    // Streak: scan backward from most recent result
    let streak = '';
    if (results.length > 0) {
      const last = results[results.length - 1];
      let n = 0;
      for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
      streak = last + n;
    }

    return {
      teamId,
      teamName,
      gp:       games.length,
      wins,
      losses,
      homeRecord: { wins: homeWins,  losses: homeLosses  },
      awayRecord:  { wins: awayWins,  losses: awayLosses  },
      confRecord:  { wins: confWins,  losses: confLosses  },
      streak,
    };
  }

  // ── StatsEngine.standings ────────────────────────────────────────────────────

  function standings(seasonId, conferenceId) {
    const games = _getGames(seasonId);

    // Accumulate one entry per team
    const teamMap = {}; // teamId → row object

    for (const g of games) {
      const sides = [[g.home, g.away], [g.away, g.home]];
      for (const [side, opp] of sides) {
        if (!teamMap[side.teamId]) {
          teamMap[side.teamId] = {
            teamId:   side.teamId,
            teamName: side.teamName,
            gp: 0, wins: 0, losses: 0,
            ptsFor: 0, ptsAgainst: 0,
          };
        }
        const row = teamMap[side.teamId];
        row.gp++;
        row.ptsFor     += side.score || 0;
        row.ptsAgainst += opp.score  || 0;
        if (g.winner === side.teamId) row.wins++; else row.losses++;
      }
    }

    let rows = Object.values(teamMap);

    // Filter by conference if requested
    if (conferenceId) {
      const confs = _getConferences();
      const conf  = confs.find(c => c.id === conferenceId || c.name === conferenceId);
      if (conf) {
        const memberSet = new Set(conf.memberIds || []);
        rows = rows.filter(r => memberSet.has(r.teamId));
      }
      // Exclude "Other" teams from all named-conference views.
      // They appear only in the unfiltered (conferenceId === null) view.
      if (conferenceId !== 'Other') {
        const otherNames = new Set(
          _getTeams().filter(t => t.conference === 'Other').map(t => t.name)
        );
        if (otherNames.size > 0) rows = rows.filter(r => !otherNames.has(r.teamName));
      }
    }

    // Compute derived stats and clean up accumulator fields
    rows = rows.map(({ ptsFor, ptsAgainst, ...r }) => ({
      ...r,
      winPct: r.gp > 0 ? r.wins / r.gp : 0,
      ppg:    r.gp > 0 ? ptsFor    / r.gp : 0,
      oppPpg: r.gp > 0 ? ptsAgainst / r.gp : 0,
      diff:   r.gp > 0 ? (ptsFor - ptsAgainst) / r.gp : 0,
    }));

    rows.sort((a, b) =>
      (b.wins   - a.wins)   ||
      (b.winPct - a.winPct) ||
      (b.diff   - a.diff)
    );

    return rows;
  }

  // ── StatsEngine.teamAverages ─────────────────────────────────────────────────

  function teamAverages(teamId, seasonId) {
    const games = _getGames(seasonId).filter(g =>
      g.home.teamId === teamId || g.away.teamId === teamId
    );

    let teamName = teamId;
    const tot = { fg:0, fga:0, '3p':0, '3pa':0, ft:0, fta:0, reb:0, ast:0, stl:0, blk:0, to:0, pf:0 };

    for (const g of games) {
      const side = g.home.teamId === teamId ? g.home : g.away;
      if (teamName === teamId) teamName = side.teamName || teamId;
      const s = side.stats || {};
      tot.fg   += s.fg   || 0;
      tot.fga  += s.fga  || 0;
      tot['3p']  += s['3p']  || 0;
      tot['3pa'] += s['3pa'] || 0;
      tot.ft   += s.ft   || 0;
      tot.fta  += s.fta  || 0;
      tot.reb  += s.reb  || 0;
      tot.ast  += s.ast  || 0;
      tot.stl  += s.stl  || 0;
      tot.blk  += s.blk  || 0;
      tot.to   += s.to   || 0;
      tot.pf   += s.pf   || 0;
    }

    const gp = games.length;
    const avg = {};
    for (const [k, v] of Object.entries(tot)) avg[k] = gp > 0 ? v / gp : 0;

    return {
      teamId,
      teamName,
      gp,
      ...avg,
      fg_pct:       tot.fga    > 0 ? tot.fg    / tot.fga    : 0,
      three_pt_pct: tot['3pa'] > 0 ? tot['3p'] / tot['3pa'] : 0,
      ft_pct:       tot.fta    > 0 ? tot.ft    / tot.fta    : 0,
    };
  }

  // ── StatsEngine.playerAverages ───────────────────────────────────────────────

  function playerAverages(seasonId, filters) {
    const games = _getGames(seasonId);
    filters = filters || {};

    // Accumulate totals keyed by player name
    const acc = {}; // name → { teamId, teamName, gp, stat totals }

    for (const g of games) {
      for (const side of [g.home, g.away]) {
        for (const p of (side.players || [])) {
          if (!acc[p.name]) {
            acc[p.name] = {
              name:     p.name,
              teamId:   side.teamId,
              teamName: side.teamName,
              gp: 0,
              pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, pf: 0,
              fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0,
            };
          }
          const a = acc[p.name];
          a.gp++;
          a.pts += p.pts     || 0;
          a.reb += p.reb     || 0;
          a.ast += p.ast     || 0;
          a.stl += p.stl     || 0;
          a.blk += p.blk     || 0;
          a.to  += p.to      || 0;
          a.pf  += p.pf      || 0;
          a.fgm += p.fgm     || 0;
          a.fga += p.fga     || 0;
          a.tpm += p['3pm']  || 0;
          a.tpa += p['3pa']  || 0;
          a.ftm += p.ftm     || 0;
          a.fta += p.fta     || 0;
        }
      }
    }

    // Build player metadata map only when a non-teamId filter is active
    let playerMeta = null;
    if (filters.conference || filters.position || filters.class) {
      const teams = _getTeams();
      playerMeta  = {};
      for (const t of teams) {
        for (const p of (t.players || [])) {
          if (!playerMeta[p.name]) {
            playerMeta[p.name] = {
              position:   p.position,
              class:      p.class,
              conference: t.conference,
              teamId:     t.id || t.name,
            };
          }
        }
      }
    }

    // Build per-game average rows
    let rows = Object.values(acc).map(a => {
      const { gp, fgm, fga, tpm, tpa, ftm, fta } = a;
      return {
        name:         a.name,
        teamId:       a.teamId,
        teamName:     a.teamName,
        gp,
        ppg:          a.pts / gp,
        rpg:          a.reb / gp,
        apg:          a.ast / gp,
        spg:          a.stl / gp,
        bpg:          a.blk / gp,
        pts:          a.pts / gp,
        reb:          a.reb / gp,
        ast:          a.ast / gp,
        stl:          a.stl / gp,
        blk:          a.blk / gp,
        to:           a.to  / gp,
        pf:           a.pf  / gp,
        fgm:          fgm / gp,
        fga:          fga / gp,
        fg_pct:       fga > 0 ? fgm / fga : 0,
        '3pm':        tpm / gp,
        '3pa':        tpa / gp,
        three_pt_pct: tpa > 0 ? tpm / tpa : 0,
        ftm:          ftm / gp,
        fta:          fta / gp,
        ft_pct:       fta > 0 ? ftm / fta : 0,
      };
    });

    // Apply teamId filter (uses data from box score, no metadata lookup needed)
    if (filters.teamId) {
      rows = rows.filter(r => r.teamId === filters.teamId);
    }

    // Apply metadata-dependent filters
    if (playerMeta) {
      rows = rows.filter(r => {
        const m = playerMeta[r.name];
        if (!m) return false;
        if (filters.conference && m.conference !== filters.conference) return false;
        if (filters.position   && m.position   !== filters.position)   return false;
        if (filters.class      && m.class       !== filters.class)      return false;
        return true;
      });
    }

    return rows;
  }

  // ── StatsEngine.strategyReport ───────────────────────────────────────────────

  // Compute the wall-clock duration (in seconds) of a strategy span.
  // Clock counts DOWN from 1200 (or 300 for OT). endHalf === null means the span
  // ran to game end (endClock is already 0 in that case).
  function _spanDuration(startHalf, startClock, endHalf, endClock) {
    if (endHalf === null) {
      // Last span — runs to game end (endClock === 0).
      // If it started in H1 it must cover H1 remaining + all of H2.
      // OT-extended games are not handled here (rare, minor inaccuracy).
      if (startHalf === 1) return startClock + 1200;
      return startClock - endClock; // started in H2 or OT — simple subtraction
    }
    if (endHalf === startHalf) {
      return startClock - endClock;
    }
    // Cross-half span: remaining seconds in start half + elapsed seconds in end half.
    // Regular halves are 1200 s; OT periods are 300 s.
    const endHalfTotal = (endHalf === 1 || endHalf === 2) ? 1200 : 300;
    return startClock + (endHalfTotal - endClock);
    // Note: ignores any fully-intermediate halves (e.g. H1→OT2 with no H2 change) — rare edge case.
  }

  // Format a total-seconds value as "M:SS" for display (mirrors formatClock in boxscore.js).
  function _fmtSecs(secs) {
    const m = Math.floor(secs / 60);
    const s = String(Math.round(secs % 60)).padStart(2, '0');
    return `${m}:${s}`;
  }

  function strategyReport(seasonId, userTeamId) {
    // Only FULL box scores have strategyLog and pbp.
    const games = _getGames(seasonId).filter(g =>
      g.strategyLog &&
      (g.home.teamId === userTeamId || g.away.teamId === userTeamId)
    );

    // Separate buckets for offense and defense — each span contributes to both independently.
    const offenseBuckets = {}; // offense → { totalSeconds, ptsScored }
    const defenseBuckets = {}; // defense → { totalSeconds, ptsAllowed }

    for (const g of games) {
      const userIsHome = g.home.teamId === userTeamId;
      const log        = g.strategyLog; // [{ time, half, homeScore, awayScore, homeOffense, homeDefense, awayOffense, awayDefense }]

      for (let i = 0; i < log.length; i++) {
        const entry = log[i];
        const next  = log[i + 1] || null;

        const offense = userIsHome ? entry.homeOffense : entry.awayOffense;
        const defense = userIsHome ? entry.homeDefense : entry.awayDefense;

        // Span boundaries — clock counts DOWN (higher value = earlier in half).
        const spanStartHalf  = entry.half;
        const spanStartClock = _parseTime(entry.time);
        const spanEndHalf    = next ? next.half        : null; // null = game end
        const spanEndClock   = next ? _parseTime(next.time) : 0;

        const spanSecs = _spanDuration(spanStartHalf, spanStartClock, spanEndHalf, spanEndClock);

        // Score delta: use scores stored directly on strategyLog entries.
        // spanStart scores come from this entry; spanEnd scores from the next entry
        // (or the final box-score score for the last span).
        const startHome = entry.homeScore || 0;
        const startAway = entry.awayScore || 0;
        const endHome   = next ? (next.homeScore || 0) : g.home.score;
        const endAway   = next ? (next.awayScore || 0) : g.away.score;

        const spanPtsHome = endHome - startHome;
        const spanPtsAway = endAway - startAway;

        const ptsScored  = userIsHome ? spanPtsHome : spanPtsAway;
        const ptsAllowed = userIsHome ? spanPtsAway : spanPtsHome;

        // Each span feeds BOTH the offense bucket and the defense bucket independently.
        if (!offenseBuckets[offense]) offenseBuckets[offense] = { totalSeconds: 0, ptsScored:  0 };
        offenseBuckets[offense].totalSeconds += spanSecs;
        offenseBuckets[offense].ptsScored    += ptsScored;

        if (!defenseBuckets[defense]) defenseBuckets[defense] = { totalSeconds: 0, ptsAllowed: 0 };
        defenseBuckets[defense].totalSeconds += spanSecs;
        defenseBuckets[defense].ptsAllowed   += ptsAllowed;
      }
    }

    // ── Build offense rows ───────────────────────────────────────────────────
    const offenseRows = Object.entries(offenseBuckets).map(([offense, b]) => {
      const minutes  = b.totalSeconds / 60;
      const tooSmall = b.totalSeconds < 60;
      return {
        offense,
        minutes,
        minutesDisplay:  _fmtSecs(b.totalSeconds),
        ptsScoredPer40:  tooSmall ? null : +((b.ptsScored / minutes) * 40).toFixed(1),
      };
    });

    offenseRows.sort((a, b) => {
      if (a.ptsScoredPer40 === null && b.ptsScoredPer40 === null) return 0;
      if (a.ptsScoredPer40 === null) return 1;
      if (b.ptsScoredPer40 === null) return -1;
      return b.ptsScoredPer40 - a.ptsScoredPer40; // DESC — higher scoring is better
    });

    // ── Build defense rows ───────────────────────────────────────────────────
    const defenseRows = Object.entries(defenseBuckets).map(([defense, b]) => {
      const minutes  = b.totalSeconds / 60;
      const tooSmall = b.totalSeconds < 60;
      return {
        defense,
        minutes,
        minutesDisplay:   _fmtSecs(b.totalSeconds),
        ptsAllowedPer40:  tooSmall ? null : +((b.ptsAllowed / minutes) * 40).toFixed(1),
      };
    });

    defenseRows.sort((a, b) => {
      if (a.ptsAllowedPer40 === null && b.ptsAllowedPer40 === null) return 0;
      if (a.ptsAllowedPer40 === null) return 1;
      if (b.ptsAllowedPer40 === null) return -1;
      return a.ptsAllowedPer40 - b.ptsAllowedPer40; // ASC — lower points allowed is better
    });

    return { offense: offenseRows, defense: defenseRows };
  }

  // ── StatsEngine.strategyDiagnostic ──────────────────────────────────────────
  // Prints raw diagnostic data to help debug strategyReport per-40 calculations.
  // Usage: StatsEngine.strategyDiagnostic('exhibition', 'Arizona')

  function strategyDiagnostic(seasonId, userTeamId) {
    const games = _getGames(seasonId).filter(g =>
      g.strategyLog &&
      (g.home.teamId === userTeamId || g.away.teamId === userTeamId)
    );

    if (games.length === 0) {
      console.warn(`[strategyDiagnostic] No FULL box scores found for team "${userTeamId}" in season "${seasonId}"`);
      console.log('All stored game keys:', Object.keys(localStorage).filter(k => k.startsWith('game:')));
      return;
    }

    // Use the most recent game (last in array — _getGames returns in key-sort order)
    const g = games[games.length - 1];
    const userIsHome = g.home.teamId === userTeamId;
    const pbp        = g.pbp || [];
    const log        = g.strategyLog || [];

    console.group(`%c[strategyDiagnostic]  ${g.away.teamName} @ ${g.home.teamName}  (user=${userIsHome ? 'home' : 'away'})`, 'font-weight:bold;font-size:1.1em');

    // ── 1. Raw strategyLog ──────────────────────────────────────────────────
    console.group('1. strategyLog (all entries)');
    console.table(log.map((e, i) => ({
      '#':            i,
      half:           e.half,
      time:           e.time,
      homeOffense:    e.homeOffense,
      homeDefense:    e.homeDefense,
      awayOffense:    e.awayOffense,
      awayDefense:    e.awayDefense,
    })));
    console.groupEnd();

    // ── 2. First 20 PBP events ───────────────────────────────────────────────
    console.group(`2. First 20 PBP events (total: ${pbp.length})`);
    console.table(pbp.slice(0, 20).map((ev, i) => ({
      '#':    i,
      half:   ev.half,
      clock:  ev.clock,
      type:   ev.type,
      text:   ev.text,
    })));
    console.groupEnd();

    // ── 3. First strategy span deep-dive ────────────────────────────────────
    if (log.length === 0) {
      console.warn('3. strategyLog is empty — no spans to analyse');
      console.groupEnd();
      return;
    }

    const entry = log[0];
    const next  = log[1] || null;

    const spanStartHalf  = entry.half;
    const spanStartClock = _parseTime(entry.time);
    const spanEndHalf    = next ? next.half          : null;
    const spanEndClock   = next ? _parseTime(next.time) : 0;
    const spanSecs       = _spanDuration(spanStartHalf, spanStartClock, spanEndHalf, spanEndClock);

    const offense = userIsHome ? entry.homeOffense : entry.awayOffense;
    const defense = userIsHome ? entry.homeDefense : entry.awayDefense;

    console.group('3. First span details');
    console.log('Entry          :', JSON.stringify(entry));
    console.log('Next entry     :', next ? JSON.stringify(next) : '(none — last span)');
    console.log(`Start          : half=${spanStartHalf}  clock=${spanStartClock}s  (parsed from "${entry.time}")`);
    console.log(`End            : half=${spanEndHalf}  clock=${spanEndClock}s  (parsed from "${next ? next.time : 'game end'}")`);
    console.log(`Span duration  : ${spanSecs}s  (${(spanSecs/60).toFixed(2)} min)`);
    console.log(`User offense   : ${offense}`);
    console.log(`User defense   : ${defense}`);

    // Score delta from stored scores on strategyLog entries
    const startHome = entry.homeScore || 0;
    const startAway = entry.awayScore || 0;
    const endHome   = next ? (next.homeScore || 0) : g.home.score;
    const endAway   = next ? (next.awayScore || 0) : g.away.score;

    const spanPtsHome = endHome - startHome;
    const spanPtsAway = endAway - startAway;
    const ptsScored   = userIsHome ? spanPtsHome : spanPtsAway;
    const ptsAllowed  = userIsHome ? spanPtsAway : spanPtsHome;

    console.log(`Score at span start : home=${startHome}  away=${startAway}  (from entry.homeScore / entry.awayScore)`);
    console.log(`Score at span end   : home=${endHome}  away=${endAway}  (from ${next ? 'next entry' : 'g.home.score / g.away.score'})`);
    console.log(`spanPtsHome=${spanPtsHome}  spanPtsAway=${spanPtsAway}`);
    console.log(`ptsScored (raw)  : ${ptsScored}   (user is ${userIsHome ? 'home' : 'away'})`);
    console.log(`ptsAllowed (raw) : ${ptsAllowed}`);
    if (spanSecs >= 60) {
      const min = spanSecs / 60;
      console.log(`ptsScoredPer40   : ${((ptsScored  / min) * 40).toFixed(1)}`);
      console.log(`ptsAllowedPer40  : ${((ptsAllowed / min) * 40).toFixed(1)}`);
    } else {
      console.log('ptsScoredPer40   : null (span < 60 s)');
      console.log('ptsAllowedPer40  : null (span < 60 s)');
    }

    console.groupEnd(); // span details
    console.groupEnd(); // outer group
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    _getGames,
    _isUserTeam,
    teamRecord,
    standings,
    teamAverages,
    playerAverages,
    strategyReport,
    strategyDiagnostic,
  };

})();
