// cpu_sim.js
// Defines window.CpuSim — wrapper for headless CPU-vs-CPU game simulation.
// Depends on: window.BoxScore (boxscore.js), runOneGame + G (game_engine_sim.js)

window.CpuSim = (() => {

  // ── CpuSim.simulateGame ───────────────────────────────────────────────────────
  //
  // homeTeam / awayTeam  — team objects from TEAMS array (must have .players, .id, .name)
  // options:
  //   isUserTeamInvolved  boolean  — if true, saves box score via BoxScore.saveFromSim
  //   userTeamId          string   — used only for logging
  //   seasonId            string   — storage key prefix for saved box score
  //
  // Returns:
  //   { homeScore, awayScore, winnerId, gameId, summary: { home, away } }

  function simulateGame(homeTeam, awayTeam, options) {
    options = options || {};

    // ── 1. Run the game ───────────────────────────────────────────────────────
    GameEngineSim.runOneGame(homeTeam, awayTeam);
    // Results are now in GameEngineSim.G (from game_engine_sim.js)
    const _G = GameEngineSim.G;

    const homeScore = _G.homeScore;
    const awayScore = _G.awayScore;
    const winnerId  = homeScore > awayScore
      ? (homeTeam.id  || homeTeam.name)
      : (awayTeam.id  || awayTeam.name);

    // ── 2. Map G.stats to BoxScore player row format ──────────────────────────
    // G.stats is keyed by player name; field names differ slightly from BoxScore format.
    // Mapping: tov→to, tpa→3pa, tpm→3pm, blk not in G.stats (set 0)
    // min: not tracked during simulation — derive from roster minutes_per_game

    const homePlayerNames = new Set((homeTeam.players || []).map(p => p.name));
    const awayPlayerNames = new Set((awayTeam.players || []).map(p => p.name));

    // Build a minutes-per-game lookup for use as the fallback min value
    function buildMpgLookup(team) {
      const map = {};
      for (const p of (team.players || [])) {
        map[p.name] = Math.round(p.minutes_per_game || 0);
      }
      return map;
    }
    const homeMpg = buildMpgLookup(homeTeam);
    const awayMpg = buildMpgLookup(awayTeam);

    function mapPlayer(name, s, mpgMap) {
      return {
        name,
        min:   mpgMap[name] || 0,
        pts:   s.pts  || 0,
        reb:   s.reb  || 0,
        ast:   s.ast  || 0,
        stl:   s.stl  || 0,
        blk:   s.blk  || 0,
        to:    s.tov  || 0,
        pf:    s.pf   || 0,
        fgm:   s.fgm  || 0,
        fga:   s.fga  || 0,
        '3pm': s.tpm  || 0,
        '3pa': s.tpa  || 0,
        ftm:   s.ftm  || 0,
        fta:   s.fta  || 0,
      };
    }

    const homePlayers = [];
    const awayPlayers = [];

    for (const [name, s] of Object.entries(_G.stats)) {
      if (homePlayerNames.has(name)) {
        homePlayers.push(mapPlayer(name, s, homeMpg));
      } else if (awayPlayerNames.has(name)) {
        awayPlayers.push(mapPlayer(name, s, awayMpg));
      }
    }

    // ── 3. Top 3 scorers per side ─────────────────────────────────────────────
    function topScorers(players) {
      return players
        .slice()
        .sort((a, b) => b.pts - a.pts)
        .slice(0, 3)
        .map(p => ({ name: p.name, pts: p.pts, reb: p.reb, ast: p.ast }));
    }

    // ── 4. Save box score if user team is involved ────────────────────────────
    let gameId = null;
    console.log('[CpuSim] game:', homeTeam.name, 'vs', awayTeam.name,
      '| isUserTeamInvolved:', options.isUserTeamInvolved,
      '| saveForStats:', options.saveForStats,
      '| seasonId:', options.seasonId);
    if (options.isUserTeamInvolved || options.saveForStats) {
      console.log('[CpuSim] SAVING box score for:', homeTeam.name, 'vs', awayTeam.name);
      gameId = BoxScore.saveFromSim(
        homeTeam, awayTeam,
        homeScore, awayScore,
        homePlayers, awayPlayers,
        options.seasonId || null,
        'season'
      );
    } else {
      console.log('[CpuSim] SKIPPING box score for:', homeTeam.name, 'vs', awayTeam.name);
    }

    // ── 5. Return result ──────────────────────────────────────────────────────
    return {
      homeScore,
      awayScore,
      winnerId,
      gameId,
      summary: {
        home: {
          teamId:     homeTeam.id   || homeTeam.name,
          teamName:   homeTeam.name,
          score:      homeScore,
          topScorers: topScorers(homePlayers),
        },
        away: {
          teamId:     awayTeam.id   || awayTeam.name,
          teamName:   awayTeam.name,
          score:      awayScore,
          topScorers: topScorers(awayPlayers),
        },
      },
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────────
  return { simulateGame };

})();
