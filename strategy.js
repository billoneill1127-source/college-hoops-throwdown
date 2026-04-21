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
    'five_out|man_to_man':           [5,  0,   0,   0.5, 0,  -2,  0, 0,0,0,0,false],
    'five_out|2_3_zone':             [5,  0,   0,   0.5, 0,   2,  5, 0,0,0,0,false],
    'five_out|1_3_1_zone':           [-10,0,   0,   0,  -3,  -3,  3, 0,0,0,0,false],
    'five_out|matchup_zone':         [-10,0,   0.5, 0,   0,  -2,  5, 0,0,0,0,false],
    'five_out|half_court_trap':      [-10,0.5, 0.5, 0,   2,   0,  3, 0,0,1,1,false],
    'five_out|full_court_press':     [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'pick_and_roll|man_to_man':      [-10,0,   0,   0.5, 0,   0,  0, 1,0,0,0,false],
    'pick_and_roll|2_3_zone':        [-10,0,   0,   0.5, 2,   2,  5, 0,0,0,0,false],
    'pick_and_roll|1_3_1_zone':      [-10,0,   0,   0,  -3,  -3,  3, 0,0,0,0,false],
    'pick_and_roll|matchup_zone':    [-10,0,   0.5, 0,   0,   0,  5, 1,0,0,0,false],
    'pick_and_roll|half_court_trap': [-20,0.5, 0.5, 0,   2,   0,  3, 1,0,1,1,false],
    'pick_and_roll|full_court_press':[0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'pick_and_pop|man_to_man':       [5,  0,   0,   0.5, 0,   0,  0, 0,0,0,0,false],
    'pick_and_pop|2_3_zone':         [5,  0,   0,   0.5, 0,   2,  5, 0,0,0,0,false],
    'pick_and_pop|1_3_1_zone':       [-10,0,   0,   0,  -3,  -3,  3, 0,0,0,0,false],
    'pick_and_pop|matchup_zone':     [-10,0,   0.5, 0,   0,   0,  5, 0,0,0,0,false],
    'pick_and_pop|half_court_trap':  [-20,0.5, 0.5, 0,   2,   0,  3, 0,0,1,1,false],
    'pick_and_pop|full_court_press': [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'motion|man_to_man':             [0,  0,   0,   0,   2,   0,  0, 0,0,0,0,false],
    'motion|2_3_zone':               [5,  0,   0,   0,   0,   2,  5, 0,0,0,0,false],
    'motion|1_3_1_zone':             [-10,0,   0.5, 0,  -3,  -3,  3, 0,0,0,0,false],
    'motion|matchup_zone':           [-10,0,   0,   0,   0,   0,  5, 0,0,0,0,false],
    'motion|half_court_trap':        [-20,0.5, 0.5, 0,   2,   0,  3, 1,0,1,1,false],
    'motion|full_court_press':       [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'high_post|man_to_man':          [5,  0,   0,   0.5, 0,   0,  0, 0,0,0,0,false],
    'high_post|2_3_zone':            [5,  0,   0,   0.5, 2,   2,  5, 0,0,0,0,false],
    'high_post|1_3_1_zone':          [-10,0,   0,   0,   0,  -3,  3, 0,0,0,0,false],
    'high_post|matchup_zone':        [-10,0,   0.5, 0,   0,   0,  5, 0,0,0,0,false],
    'high_post|half_court_trap':     [-20,0.5, 0.5, 0,   2,   0,  3, 0,0,1,1,false],
    'high_post|full_court_press':    [0,  0.5, 0.5, 0,   0,   0,  3, 0,1,2,1,0.50],
    'low_post|man_to_man':           [0,  1,   0,   0,   0,   0,  0, 0,0,0,0,false],
    'low_post|2_3_zone':             [0,  0,   0,   0.5,-3,   2,  5, 0,0,0,0,false],
    'low_post|1_3_1_zone':           [-10,0.5, 0,   0,  -3,  -3,  3, 0,0,0,0,false],
    'low_post|matchup_zone':         [-10,0,   0.5, 0,   0,   0,  5, 0,0,0,0,false],
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

  // Sets strategy on cpuTeam based on roster composition (isHalftime=false)
  // or opponent first-half performance (isHalftime=true).
  // gameState must have: { home, away, stats }
  // p1Team is derived as whichever team is not cpuTeam.
  function cpuChoose(cpuTeam, isHalftime, gameState) {
    if (!cpuTeam) return;
    const p1Team = gameState.home === cpuTeam ? gameState.away : gameState.home;

    if (!isHalftime) {
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
      cpuTeam.strategy_defense = 'man_to_man';
    } else {
      // ── Halftime: adjust defense based on opponent's first-half stats ──
      const p1Players = p1Team.allPlayers || [...(p1Team.lineup || []), ...(p1Team.bench || [])];
      let p1FGM = 0, p1FGA = 0, p1TPA = 0, p1AST = 0;
      for (const p of p1Players) {
        const s = gameState.stats[p.name] || {};
        p1FGM += s.fgm || 0; p1FGA += s.fga || 0; p1TPA += s.tpa || 0; p1AST += s.ast || 0;
      }
      const p1FGpct    = p1FGA > 0 ? p1FGM / p1FGA : 0.45;
      const p1ThreeRate = p1FGA > 0 ? p1TPA / p1FGA : 0;
      let def;
      if (p1ThreeRate > 0.40 && p1FGpct > 0.44)  def = '2_3_zone';
      else if (p1AST > 10)                         def = 'matchup_zone';
      else if (p1FGpct > 0.52)                     def = '1_3_1_zone';
      else                                         def = 'man_to_man';
      cpuTeam.strategy_defense = def;
    }
  }

  return { getMods, randomAssign, cpuChoose, OFFENSE_STRATEGIES, DEFENSE_STRATEGIES };

})();
