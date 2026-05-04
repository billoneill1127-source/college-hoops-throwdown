// strategy.js
// Shared strategy module — loaded by index.html, game_engine_sim.js (via simulate.html), and season.html.
// Exposes window.Strategy with getMods, randomAssign, cpuChoose, and the strategy key lists.

window.Strategy = (function () {

  const OFFENSE_STRATEGIES = [
    'motion', 'pick_and_roll', 'pick_and_pop',
    'high_post', 'low_post', 'five_out'
  ];

  // full_court_press excluded — reserved for end-game situations in index.html only
  const DEFENSE_STRATEGIES = [
    'man_to_man', '2_3_zone', '1_3_1_zone',
    'matchup_zone', 'half_court_trap'
  ];

  // Strategy modifier table: [tpa, cwm, fwm, gwm, tp2, tp3, orb, ast, stl, tov, foul, fb]
  // tpa/tp2/tp3/orb: divide by 100 for decimal. cwm/fwm/gwm: additive to 1.0.
  // ast/stl/tov/foul: extra check counts. fb: offense fast break chance.
  const STRATEGY_MODS = {
    'five_out|man_to_man':           [5,  0,   0,   0.5,-1,  -2,  0, 0,0,0,0,false],
    'five_out|2_3_zone':             [5,  0,   0,   0.5,-1,   1,  3, 0,0,0,0,false],
    'five_out|1_3_1_zone':           [-10,0,   0,   0,  -3,  -1,  5, 0,0,0,0,false],
    'five_out|matchup_zone':         [-10,0,   0.5, 0,  -1,  -2,  3, 0,0,0,0,false],
    'five_out|half_court_trap':      [-10,0.5, 0.5, 0,   0,   0,  3, 0,0,1,1,false],
    'five_out|full_court_press':     [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'pick_and_roll|man_to_man':      [-10,0,   0,   0.5, 0,   0,  0, 1,0,0,0,false],
    'pick_and_roll|2_3_zone':        [-10,0,   0,   0.5, 1,   1,  3, 0,0,0,0,false],
    'pick_and_roll|1_3_1_zone':      [-10,0,   0,   0,  -3,  -3,  5, 0,0,0,0,false],
    'pick_and_roll|matchup_zone':    [-10,0,   0.5, 0,   1,   0,  3, 1,0,0,0,false],
    'pick_and_roll|half_court_trap': [-20,0.5, 0.5, 0,   2,   0,  3, 1,0,1,1,false],
    'pick_and_roll|full_court_press':[0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'pick_and_pop|man_to_man':       [5,  0,   0,   0.5, 0,   0,  0, 0,0,0,0,false],
    'pick_and_pop|2_3_zone':         [5,  0,   0,   0.5, 0,   2,  3, 0,0,0,0,false],
    'pick_and_pop|1_3_1_zone':       [-10,0,   0,   0,  -3,  -3,  5, 0,0,0,0,false],
    'pick_and_pop|matchup_zone':     [-10,0,   0.5, 0,   0,   0,  3, 0,0,0,0,false],
    'pick_and_pop|half_court_trap':  [-20,0.5, 0.5, 0,   1,   0,  3, 0,0,1,1,false],
    'pick_and_pop|full_court_press': [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'motion|man_to_man':             [0,  0,   0,   0,   1,   0,  0, 0,0,0,0,false],
    'motion|2_3_zone':               [5,  0,   0,   0,  -2,   1,  3, 0,0,0,0,false],
    'motion|1_3_1_zone':             [-10,0,   0.5, 0,  -3,  -3,  5, 0,0,0,0,false],
    'motion|matchup_zone':           [-10,0,   0,   0,   0,   0,  3, 0,0,0,0,false],
    'motion|half_court_trap':        [-20,0.5, 0.5, 0,   2,   0,  3, 1,0,1,1,false],
    'motion|full_court_press':       [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'high_post|man_to_man':          [5,  0,   0,   0.5, 0,   0,  0, 0,0,0,0,false],
    'high_post|2_3_zone':            [5,  0,   0,   0.5, 2,   2,  3, 0,0,0,0,false],
    'high_post|1_3_1_zone':          [-10,0,   0,   0,  -2,  -3,  5, 0,0,0,0,false],
    'high_post|matchup_zone':        [-10,0,   0.5, 0,   2,   2,  3, 0,0,0,0,false],
    'high_post|half_court_trap':     [-20,0.5, 0.5, 0,   1,   0,  3, 0,0,1,1,false],
    'high_post|full_court_press':    [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'low_post|man_to_man':           [0,  1,   0,   0,   0,   0,  0, 0,0,0,0,false],
    'low_post|2_3_zone':             [0,  0,   0,   0.5,-2,   1,  3, 0,0,0,0,false],
    'low_post|1_3_1_zone':           [-10,0.5, 0,   0,   0,  -1,  5, 0,0,0,0,false],
    'low_post|matchup_zone':         [-10,0,   0.5, 0,   2,   1,  3, 0,0,0,0,false],
    'low_post|half_court_trap':      [-20,0.5, 0.5, 0,   2,   0,  3, 0,0,1,1,false],
    'low_post|full_court_press':     [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
  };

  // Converts a raw STRATEGY_MODS array into a named mods object.
  // Returns an object compatible with both GE_MODS (index.html) and NEUTRAL_MODS (game_engine_sim.js).
  function getMods(offStrat, defStrat) {
    const key = (offStrat || 'motion') + '|' + (defStrat || 'man_to_man');
    const m = STRATEGY_MODS[key] || STRATEGY_MODS['motion|man_to_man'];
    return {
      three_pa_rate_mod:         (m[0] || 0) / 100,
      center_weight_mod:         1 + (m[1] || 0),
      forward_weight_mod:        1 + (m[2] || 0),
      guard_weight_mod:          1 + (m[3] || 0),
      two_pt_pct_mod:            (m[4] || 0) / 100,
      three_pt_pct_mod:          (m[5] || 0) / 100,
      offensive_rebound_pct_mod: (m[6] || 0) / 100,
      extra_assist_checks:       m[7] || 0,
      extra_steal_checks:        m[8] || 0,
      extra_tov_checks:          m[9] || 0,
      extra_foul_checks:         m[10] || 0,
      offense_fastbreak:         m[11] || 0,
      steal_chance_mod:          1.0,
      turnover_chance_mod:       1.0,
    };
  }

  // Assigns a random offense and defense to a team object.
  // Used by game_engine_sim.js for CPU-vs-CPU sim games.
  function randomAssign(team) {
    team.strategy_offense = OFFENSE_STRATEGIES[Math.floor(Math.random() * OFFENSE_STRATEGIES.length)];
    team.strategy_defense = DEFENSE_STRATEGIES[Math.floor(Math.random() * DEFENSE_STRATEGIES.length)];
  }

  // Sets offense on cpuTeam based on roster composition.
  // Defense is set separately via cpuPickDefense.
  function cpuChoose(cpuTeam, gameState) {
    if (!cpuTeam) return;
    // ── Offense: based on position FGA distribution and 3pt tendencies ──
    const players = cpuTeam.allPlayers || cpuTeam.lineup || [];
    const posFGA = { G: 0, F: 0, C: 0 }, posCount = { G: 0, F: 0, C: 0 };
    for (const p of players) {
      if (posFGA[p.position] !== undefined) {
        posFGA[p.position] += (p.fga_per_100 || 0);
        posCount[p.position]++;
      }
    }
    const avgG = posCount.G > 0 ? posFGA.G / posCount.G : 0;
    const avgF = posCount.F > 0 ? posFGA.F / posCount.F : 0;
    const avgC = posCount.C > 0 ? posFGA.C / posCount.C : 0;
    const avgThreeRate = players.reduce((s, p) => s + (p.three_pa_rate || 0), 0) / Math.max(players.length, 1);
    let off;
    if (avgC > avgG * 1.2 && avgC > avgF * 1.1)                               off = 'low_post';
    else if (avgThreeRate > 0.38)                                              off = Math.random() < 0.5 ? 'five_out' : 'pick_and_pop';
    else if (avgG > avgF && avgG > avgC && (cpuTeam.assist_rate || 0) > 0.50) off = Math.random() < 0.5 ? 'pick_and_roll' : 'motion';
    else if (avgF >= avgG)                                                     off = Math.random() < 0.5 ? 'high_post' : 'motion';
    else                                                                       off = 'motion';
    cpuTeam.strategy_offense = off;
  }

  // ── CPU Defense Selection Table ────────────────────────────────────────────
  // Conditions are from CPU's perspective:
  //   high2pt:   P1 2PT FG% > 55%  (min 10 2PA)
  //   high3pt:   P1 3PT FG% > 40%  (min 6 3PA)
  //   rebMargin: P1 rebounds / CPU rebounds > 1.2
  //   losing10:  CPU trailing by more than 10 points
  // Weights: [man_to_man, 2_3_zone, 1_3_1_zone, matchup_zone, half_court_trap]

  const CPU_DEFENSE_TABLE = [
    { c: [0,0,0,0], w: [64,12,12,12, 0] },
    { c: [0,0,0,1], w: [61,12,12, 5,10] },
    { c: [0,0,1,0], w: [78,12, 0,10, 0] },
    { c: [0,0,1,1], w: [73,12, 0, 5,10] },
    { c: [0,1,0,0], w: [60, 0,20,20, 0] },
    { c: [0,1,0,1], w: [50, 0,20,20,10] },
    { c: [0,1,1,0], w: [70, 0,10,20, 0] },
    { c: [0,1,1,1], w: [60, 0,10,20,10] },
    { c: [1,0,0,0], w: [63,20,12, 5, 0] },
    { c: [1,0,0,1], w: [60,20,10, 0,10] },
    { c: [1,0,1,0], w: [65,20, 5,10, 0] },
    { c: [1,0,1,1], w: [60,20, 5, 5,10] },
    { c: [1,1,0,0], w: [60,15,20, 5, 0] },
    { c: [1,1,0,1], w: [50,15,20, 5,10] },
    { c: [1,1,1,0], w: [60,15,10,15, 0] },
    { c: [1,1,1,1], w: [50,15,10,15,10] },
  ];

  const CPU_DEFENSE_OPTIONS = [
    'man_to_man', '2_3_zone', '1_3_1_zone', 'matchup_zone', 'half_court_trap'
  ];

  function weightedPick(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return CPU_DEFENSE_OPTIONS[i];
    }
    return CPU_DEFENSE_OPTIONS[0];
  }

  function getCpuDefenseConditions(cpuTeam, p1Team, gameState) {
    const p1Stats = gameState.stats || {};

    let p1fgm2 = 0, p1fga2 = 0;
    for (const p of p1Team.allPlayers || []) {
      const st = p1Stats[p.name] || {};
      p1fgm2 += (st.fgm || 0) - (st.tpm || 0);
      p1fga2 += (st.fga || 0) - (st.tpa || 0);
    }
    const high2pt = p1fga2 >= 10 && (p1fgm2 / p1fga2) > 0.55 ? 1 : 0;

    let p1tpm = 0, p1tpa = 0;
    for (const p of p1Team.allPlayers || []) {
      const st = p1Stats[p.name] || {};
      p1tpm += st.tpm || 0;
      p1tpa += st.tpa || 0;
    }
    const high3pt = p1tpa >= 6 && (p1tpm / p1tpa) > 0.40 ? 1 : 0;

    let p1reb = 0, cpuReb = 0;
    for (const p of p1Team.allPlayers || []) { p1reb += (p1Stats[p.name]?.reb || 0); }
    for (const p of cpuTeam.allPlayers || []) { cpuReb += (gameState.stats?.[p.name]?.reb || 0); }
    const rebMargin = cpuReb > 0 && (p1reb / cpuReb) > 1.2 ? 1 : 0;

    const cpuScore = cpuTeam.isHome ? gameState.homeScore : gameState.awayScore;
    const p1Score  = p1Team.isHome  ? gameState.homeScore : gameState.awayScore;
    const losing10 = (p1Score - cpuScore) > 10 ? 1 : 0;

    return [high2pt, high3pt, rebMargin, losing10];
  }

  // Main CPU defense picker — call at game start and all stoppages.
  // Never changes away from full_court_press (manual-only).
  function cpuPickDefense(cpuTeam, p1Team, gameState) {
    if (cpuTeam.strategy_defense === 'full_court_press') return 'full_court_press';
    const conds = getCpuDefenseConditions(cpuTeam, p1Team, gameState);
    const row = CPU_DEFENSE_TABLE.find(r =>
      r.c[0] === conds[0] && r.c[1] === conds[1] &&
      r.c[2] === conds[2] && r.c[3] === conds[3]
    );
    return weightedPick(row ? row.w : [64,12,12,12,0]);
  }

  return { getMods, randomAssign, cpuChoose, cpuPickDefense, OFFENSE_STRATEGIES, DEFENSE_STRATEGIES };

})();
