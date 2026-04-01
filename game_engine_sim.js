// game_engine_sim.js
// Shared simulation core — used by simulate.html (dev harness) and cpu_sim.js.
// No DOM or UI code. Requires window.BoxScore to be loaded first.
// All state is encapsulated; access via window.GameEngineSim.

window.GameEngineSim = (function () {

  const NEUTRAL_MODS = {
    three_pa_rate_mod: 0,
    guard_weight_mod: 1.0, forward_weight_mod: 1.0, center_weight_mod: 1.0,
    two_pt_pct_mod: 0, three_pt_pct_mod: 0,
    steal_chance_mod: 1.0, turnover_chance_mod: 1.0
  };

  const STAT_DEFAULTS = {
    fga_per_100: 5, three_point_pct: 0.33, two_point_pct: 0.48,
    free_throw_pct: 0.70, offensive_rebounds_per_100: 1.5,
    defensive_rebounds_per_100: 3.5, assists_per_100: 1.5,
    steals_per_100: 0.8, blocks_per_100: 0.5,
    turnovers_per_100: 2.0, personal_fouls_per_100: 4.0
  };

  const THREE_PA_RATE_DEFAULTS = { G: 0.35, F: 0.25, C: 0.10 };

  // Assisted shot make probabilities — used in both the shot resolution and
  // the calcNonAssistedPct formula to keep the math consistent.
  // Treating assisted shots as 100% makes inflates the formula and floors
  // non-assisted attempts near 0.05 for most real-world shooting percentages.
  const ASSISTED_PCT_2 = 0.58;  // assisted 2-pointers
  const ASSISTED_PCT_3 = 0.41;  // assisted 3-pointers

  // Chance of a foul being called during a contested rebound
  const REBOUND_FOUL_CHANCE = 0.06;

  // ═══════════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════════

  function sd(val, key) {
    const v = parseFloat(val);
    return (val == null || isNaN(v)) ? (STAT_DEFAULTS[key] || 0) : v;
  }

  function weightedRandom(items, weights) {
    const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
    if (total === 0) return items[Math.floor(Math.random() * items.length)];
    let t = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
      t -= Math.max(0, weights[i]);
      if (t <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  function perPossessionChance(statPer100, teamPoss) {
    return (sd(statPer100, null) / 100) * ((teamPoss || 70) / 70);
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function calcNonAssistedPct(basePct, assistRate, isThree) {
    const ar = clamp(assistRate || 0.54, 0.01, 0.99);
    const assistedPct = isThree ? ASSISTED_PCT_3 : ASSISTED_PCT_2;
    // basePct = ar * assistedPct + (1-ar) * nonAssistedPct  →  solve for nonAssistedPct
    return clamp((basePct - ar * assistedPct) / (1 - ar), 0.05, 0.95);
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME STATE
  // ═══════════════════════════════════════════════════════════════

  let G = null;
  let pbp = [];   // play-by-play log

  function buildTeam(td, isHome) {
    const eligible = [...(td.players || [])]
      .filter(p => (p.minutes_per_game || 0) > 0 && p.fga_per_100 != null)
      .sort((a, b) => (b.minutes_per_game || 0) - (a.minutes_per_game || 0))
      .map(p => ({
        ...p,
        three_pa_rate: (p.three_pa_per_100 && p.fga_per_100)
          ? clamp(p.three_pa_per_100 / p.fga_per_100, 0, 1)
          : (THREE_PA_RATE_DEFAULTS[p.position] || 0.25),
        gamePF: 0
      }));

    return {
      id: td.id || td.name, name: td.name, nickname: td.nickname || '', isHome,
      possessions_per_game: td.possessions_per_game || 70,
      offensive_rebound_pct: td.offensive_rebound_pct || 0.28,
      defensive_rebound_pct: td.defensive_rebound_pct || 0.72,
      assist_rate: td.assist_rate || 0.54,
      team_fouls_per_game: td.team_fouls_per_game || 18,
      home_fg_bonus: td.home_fg_bonus || 0.02,
      allPlayers: eligible,
      lineup: eligible.slice(0, 5),
      bench:  eligible.slice(5),
      strategy_offense: 'motion',
      strategy_defense: 'man_to_man',
      teamFouls: 0,
      currentRun: 0
    };
  }

  function initGame(homeData, awayData) {
    pbp = [];
    G = {
      home: buildTeam(homeData, true),
      away: buildTeam(awayData, false),
      homeScore: 0, awayScore: 0,
      clock: 1200, half: 1,
      possession: Math.random() < 0.5 ? 'home' : 'away',
      momentum: 0,
      homeTimeouts: 3, awayTimeouts: 3,
      mediaTimeouts: [960, 720, 480, 240],
      stats: {},
      halfPossessions: 0, totalPossessions: 0
    };
    for (const p of [...(G.home.allPlayers||[]), ...(G.away.allPlayers||[])]) {
      G.stats[p.name] = { pts:0, reb:0, ast:0, stl:0, blk:0, tov:0,
                          fga:0, fgm:0, tpa:0, tpm:0, fta:0, ftm:0, pf:0 };
    }
  }

  function offTeam() { return G.possession === 'home' ? G.home : G.away; }
  function defTeam() { return G.possession === 'home' ? G.away : G.home; }
  function switchPossession() { G.possession = G.possession === 'home' ? 'away' : 'home'; }

  // ═══════════════════════════════════════════════════════════════
  // CLOCK
  // ═══════════════════════════════════════════════════════════════

  function decrementClock(s) { G.clock = Math.max(0, G.clock - s); }

  function checkMediaTimeout(clockBefore, eventType) {
    const ELIGIBLE = ['turnover', 'non_shooting_foul', 'shooting_foul'];
    if (!ELIGIBLE.includes(eventType)) return;
    for (const t of [...G.mediaTimeouts]) {
      if (clockBefore > t && G.clock <= t) {
        G.mediaTimeouts = G.mediaTimeouts.filter(x => x !== t);
        const m = Math.floor(t / 60), s = String(t % 60).padStart(2,'0');
        log(`━━━ MEDIA TIMEOUT (${m}:${s}) ━━━`, 'info');
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MOMENTUM
  // ═══════════════════════════════════════════════════════════════

  function getMomentumMod(isHome) {
    return (isHome ? G.momentum : -G.momentum) * 0.004;
  }

  function applyMomentumBasket(scoringTeamIsHome, gain) {
    const dir = scoringTeamIsHome ? 1 : -1;
    if (scoringTeamIsHome) G.momentum = Math.max(0, G.momentum);
    else                   G.momentum = Math.min(0, G.momentum);
    G.momentum = clamp(G.momentum + dir * gain, -5, 5);
  }

  function applyMomentumEvent(teamIsHome, gain) {
    const dir = teamIsHome ? 1 : -1;
    G.momentum = clamp(G.momentum + dir * gain, -5, 5);
  }

  function updateRun(scoringTeamIsHome, pts) {
    const scoring = scoringTeamIsHome ? G.home : G.away;
    const other   = scoringTeamIsHome ? G.away : G.home;
    const prev = scoring.currentRun;
    scoring.currentRun += pts;
    other.currentRun = 0;
    const dir = scoringTeamIsHome ? 1 : -1;
    for (const t of [6, 8, 10, 12]) {
      if (prev < t && scoring.currentRun >= t) {
        G.momentum = clamp(G.momentum + dir, -5, 5);
        log(`━━━ ${scoring.name} on a ${scoring.currentRun}-0 RUN! ━━━`, 'run');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // SHOT SELECTION
  // ═══════════════════════════════════════════════════════════════

function selectShooter(players, mods) {
    const w = players.map(p => {
      let wt = sd(p.fga_per_100, 'fga_per_100');
      if (p.position === 'G') wt *= mods.guard_weight_mod;
      if (p.position === 'F') wt *= mods.forward_weight_mod;
      if (p.position === 'C') wt *= mods.center_weight_mod;
      return wt;
    });
    return weightedRandom(players, w);
  }

  // ═══════════════════════════════════════════════════════════════
  // REBOUND SYSTEM
  // ═══════════════════════════════════════════════════════════════

  function resolveRebound(offT, defT, isThree) {
    // Rebound foul check — off-ball fouls are common in rebound battles
    // 70% defensive foul (over-the-back), 30% offensive foul
    if (Math.random() < REBOUND_FOUL_CHANCE) {
      if (Math.random() < 0.70) {
        // Defensive foul on the rebound
        defT.teamFouls++;
        const fouler = defT.lineup[Math.floor(Math.random() * defT.lineup.length)];
        fouler.gamePF++;
        G.stats[fouler.name].pf++;
        checkFoulOut(fouler, defT);
        const fouledPlayer = offT.lineup[Math.floor(Math.random() * offT.lineup.length)];
        log(`  Rebound foul on ${fouler.name} — ${foulDesc(fouler, defT)}${defT.teamFouls >= 7 ? ` — ${fouledPlayer.name} to shoot` : ''}`, 'foul');
        if (defT.teamFouls >= 10) {
          resolveFreeThrows(fouledPlayer, offT, defT, 2);
        } else if (defT.teamFouls >= 7) {
          resolveOneAndOne(fouledPlayer, offT, defT);
        }
        // Under bonus: offT retains possession (no switchPossession needed)
        return false;  // no ORB continuation — new possession
      } else {
        // Offensive foul on the rebound
        const fouler = offT.lineup[Math.floor(Math.random() * offT.lineup.length)];
        fouler.gamePF++;
        G.stats[fouler.name].pf++;
        log(`  Offensive rebound foul on ${fouler.name} — ${ordinal(fouler.gamePF)} personal — ${defT.name} ball`, 'foul');
        checkFoulOut(fouler, offT);
        switchPossession();
        return false;
      }
    }

    const offStr = offT.lineup.reduce((s,p) => s + sd(p.offensive_rebounds_per_100,'offensive_rebounds_per_100'), 0);
    const defStr = defT.lineup.reduce((s,p) => s + sd(p.defensive_rebounds_per_100,'defensive_rebounds_per_100'), 0);
    const blended = offT.offensive_rebound_pct * (0.70 + 0.30 * ((offStr / 10.0) / (defStr / 18.0)));
    const prob = clamp(blended, 0.05, 0.60);

    if (Math.random() < prob) {
      const r = assignRebounder(offT.lineup, 'offensive', isThree);
      G.stats[r.name].reb++;
      log(`  OFF REB: ${r.name} (${offT.name})`, 'reb');
      applyMomentumEvent(offT.isHome, 1);
      return true;
    } else {
      const r = assignRebounder(defT.lineup, 'defensive', isThree);
      G.stats[r.name].reb++;
      log(`  DEF REB: ${r.name} (${defT.name})`, 'reb');
      switchPossession();
      return false;
    }
  }

  function resolveFTRebound(shootT, oppT) {
    const stronger = shootT.offensive_rebound_pct > (1 - oppT.defensive_rebound_pct);
    if (Math.random() < (stronger ? 0.20 : 0.15)) {
      const r = assignRebounder(shootT.lineup, 'offensive', false);
      G.stats[r.name].reb++;
      log(`  FT OFF REB: ${r.name}`, 'reb');
      applyMomentumEvent(shootT.isHome, 1);
    } else {
      const r = assignRebounder(oppT.lineup, 'defensive', false);
      G.stats[r.name].reb++;
      log(`  FT DEF REB: ${r.name}`, 'reb');
      switchPossession();
    }
  }

  function assignRebounder(players, type, isThree) {
    const w = players.map(p => {
      let wt = type === 'offensive'
        ? sd(p.offensive_rebounds_per_100, 'offensive_rebounds_per_100')
        : sd(p.defensive_rebounds_per_100, 'defensive_rebounds_per_100');
      if (!isThree) { if (p.position==='F') wt*=1.3; if (p.position==='C') wt*=1.5; }
      else          { if (p.position==='G') wt*=1.4; }
      return wt;
    });
    return weightedRandom(players, w);
  }

  // ═══════════════════════════════════════════════════════════════
  // FOUL SYSTEM
  // ═══════════════════════════════════════════════════════════════

  const ORDINALS = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth'];
  function ordinal(n) { return ORDINALS[n - 1] || (n + 'th'); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Non-shooting foul tag: "third personal, eighth on Purdue"
  function foulDesc(player, team) {
    return `${ordinal(player.gamePF)} personal, ${ordinal(team.teamFouls)} on ${team.name}`;
  }
  // Shooting foul tag: "Third foul on Smith. Eighth on Purdue. Wagler to shoot two."
  function shootFoulDesc(fouler, team, shooter, ftDesc) {
    return `${cap(ordinal(fouler.gamePF))} foul on ${fouler.name}. ${cap(ordinal(team.teamFouls))} on ${team.name}. ${shooter.name} to shoot ${ftDesc}.`;
  }

  // Call after incrementing gamePF. CPU sub: same position first, then any.
  // In the full game UI, human teams will trigger an interactive substitution instead.
  function checkFoulOut(player, team) {
    if (player.gamePF < 5) return;
    const idx = team.lineup.indexOf(player);
    if (idx === -1) return;
    // Prefer same position, fall back to highest remaining MPG
    const samePosIdx = team.bench.findIndex(p => p.position === player.position);
    const subIdx = samePosIdx !== -1 ? samePosIdx : 0;
    const sub = team.bench.length > 0 ? team.bench.splice(subIdx, 1)[0] : null;
    if (sub) {
      team.lineup[idx] = sub;
      if (!G.stats[sub.name]) {
        G.stats[sub.name] = { pts:0, reb:0, ast:0, stl:0, tov:0, fga:0, fgm:0, tpa:0, tpm:0, fta:0, ftm:0, pf:0 };
      }
      log(`  FOUL OUT: ${player.name} has fouled out — ${sub.name} (${sub.position}) enters for ${team.name}`, 'foul');
    } else {
      team.lineup.splice(idx, 1);
      log(`  FOUL OUT: ${player.name} has fouled out — ${team.name} playing short-handed`, 'foul');
    }
  }

  function checkShootingFoul(defenders, shooter, defT) {
    // Use team-level foul rate: ~42% of all team fouls are shooting fouls
    const teamChance = (defT.team_fouls_per_game / defT.possessions_per_game) * 0.42;
    if (Math.random() < teamChance) {
      const w = defenders.map(p => sd(p.personal_fouls_per_100,'personal_fouls_per_100'));
      const fouler = weightedRandom(defenders, w);
      defT.teamFouls++;
      fouler.gamePF++;
      G.stats[fouler.name].pf++;
      checkFoulOut(fouler, defT);
      return { occurred: true, fouler };
    }
    return { occurred: false };
  }

  function resolveFreeThrows(shooter, shootT, oppT, count) {
    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const made = Math.random() < sd(shooter.free_throw_pct, 'free_throw_pct');
      G.stats[shooter.name].fta++;
      if (made) {
        G.stats[shooter.name].ftm++;
        G.stats[shooter.name].pts++;
        if (shootT.isHome) G.homeScore++; else G.awayScore++;
        updateRun(shootT.isHome, 1);
        if (shootT.isHome) G.momentum = Math.max(0, G.momentum);
        else               G.momentum = Math.min(0, G.momentum);
        log(`  FT ${i+1}/${count}: ${shooter.name} MADE (${G.homeScore}-${G.awayScore})`, 'ft');
      } else {
        log(`  FT ${i+1}/${count}: ${shooter.name} missed`, 'ft');
      }
      if (isLast) {
        if (made) switchPossession();
        else resolveFTRebound(shootT, oppT);
      }
    }
  }

  function resolveOneAndOne(shooter, shootT, oppT) {
    const made = Math.random() < sd(shooter.free_throw_pct, 'free_throw_pct');
    G.stats[shooter.name].fta++;
    if (made) {
      G.stats[shooter.name].ftm++;
      G.stats[shooter.name].pts++;
      if (shootT.isHome) G.homeScore++; else G.awayScore++;
      updateRun(shootT.isHome, 1);
      log(`  1-and-1 FT 1: ${shooter.name} MADE — shooting again`, 'ft');
      resolveFreeThrows(shooter, shootT, oppT, 1);
    } else {
      log(`  1-and-1 FT 1: ${shooter.name} missed — no 2nd shot`, 'ft');
      resolveFTRebound(shootT, oppT);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PLAY-BY-PLAY LOG
  // ═══════════════════════════════════════════════════════════════

  function log(text, type) {
    const m = String(Math.floor(G.clock / 60)).padStart(2,'0');
    const s = String(G.clock % 60).padStart(2,'0');
    pbp.push({ text: `[${m}:${s}] ${text}`, type: type || 'ev' });
  }

  // ═══════════════════════════════════════════════════════════════
  // BLOCK SYSTEM
  // ═══════════════════════════════════════════════════════════════

  function checkBlock(defTeam) {
    const teamBlockChance = defTeam.lineup.reduce((sum, d) =>
      sum + perPossessionChance(sd(d.blocks_per_100, 'blocks_per_100'), defTeam.possessions_per_game), 0
    );
    if (Math.random() >= teamBlockChance) return { occurred: false };
    const blocker = weightedRandom(defTeam.lineup,
      defTeam.lineup.map(d => sd(d.blocks_per_100, 'blocks_per_100')));
    return { occurred: true, blocker };
  }

  function resolveBlockedShot(shooter, blocker, off, def, isThree) {
    const foul = checkShootingFoul(def.lineup, shooter, def);

    if (foul.occurred) {
      // Block cancelled by foul — no FGA, no BLK, shooter goes to line
      const ftCount = isThree ? 3 : 2;
      const ftDesc  = isThree ? 'three' : 'two';
      log(`BLOCK + FOUL: ${blocker.name} blocked ${shooter.name} but fouled — ${shootFoulDesc(foul.fouler, def, shooter, ftDesc)}`, 'foul');
      resolveFreeThrows(shooter, off, def, ftCount);
      checkMediaTimeout(G.clock, 'shooting_foul');
      return false;
    }

    // Clean block — FGA to shooter, BLK to blocker
    G.stats[shooter.name].fga++;
    if (isThree) G.stats[shooter.name].tpa++;
    G.stats[blocker.name].blk++;
    log(`BLOCK: ${blocker.name} (${def.name}) blocks ${shooter.name} (${off.name}) | ${G.homeScore}-${G.awayScore}`, 'block');

    // Rebound at reduced defensive probability
    const drbChance = (def.defensive_rebound_pct || 0.72) - 0.10;
    if (Math.random() > drbChance) {
      // Offensive rebound
      const r = assignRebounder(off.lineup, 'offensive', isThree);
      G.stats[r.name].reb++;
      log(`  OFF REB (block): ${r.name} (${off.name})`, 'reb');
      applyMomentumEvent(off.isHome, 1);
      return resolvePutbackOrPossession(r, off, def, isThree);
    } else {
      // Defensive rebound
      const r = assignRebounder(def.lineup, 'defensive', isThree);
      G.stats[r.name].reb++;
      log(`  DEF REB (block): ${r.name} (${def.name})`, 'reb');
      switchPossession();
      return false;
    }
  }

  function resolvePutbackOrPossession(rebounder, off, def, isThree) {
    if (Math.random() < 0.30) {
      // Putback attempt — rebounder shoots immediately, 5s clock, no assist
      decrementClock(5);
      const made = Math.random() < sd(rebounder.two_point_pct, 'two_point_pct');
      G.stats[rebounder.name].fga++;
      G.stats[rebounder.name].pts += made ? 2 : 0;
      if (made) {
        G.stats[rebounder.name].fgm++;
        if (off.isHome) G.homeScore += 2; else G.awayScore += 2;
        applyMomentumBasket(off.isHome, 0);
        updateRun(off.isHome, 2);
        log(`PUTBACK: ${rebounder.name} (${off.name}) | ${G.homeScore}-${G.awayScore}`, 'make');
        switchPossession();
        return false;
      } else {
        log(`PUTBACK MISS: ${rebounder.name} (${off.name})`, 'miss');
        resolveRebound(off, def, false);
        return false;
      }
    } else {
      // Normal ORB continuation — signal runHalf to use isOrb=true next possession
      return true;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MAIN POSSESSION RESOLVER
  // ═══════════════════════════════════════════════════════════════

  // Returns true if possession ended with an offensive rebound (next poss uses 8s clock)
  function runPossession(isOrb, retryDepth) {
    if (G.clock <= 0) return false;
    retryDepth = retryDepth || 0;

    const off = offTeam(), def = defTeam();
    const mods = NEUTRAL_MODS;
    G.totalPossessions++;

    // ── Pre-shot non-shooting foul ──────────────────────────────
    const preShotChance = (def.team_fouls_per_game / 40) * 0.15;
    if (Math.random() < preShotChance) {
      // Determine offensive vs defensive before logging anything
      if (Math.random() < 0.12) {
        // Offensive foul — fouler is on offense
        const fouler = off.lineup[Math.floor(Math.random() * off.lineup.length)];
        fouler.gamePF++;
        G.stats[fouler.name].pf++;
        log(`Offensive foul on ${fouler.name} — ${ordinal(fouler.gamePF)} personal — ${def.name} ball`, 'foul');
        checkFoulOut(fouler, off);
        switchPossession();
        return false;
      }

      // Defensive non-shooting foul — pick both players
      const fouledPlayer = off.lineup[Math.floor(Math.random() * off.lineup.length)];
      const defFouler = weightedRandom(def.lineup, def.lineup.map(p => sd(p.personal_fouls_per_100,'personal_fouls_per_100')));
      def.teamFouls++;
      defFouler.gamePF++;
      G.stats[defFouler.name].pf++;
      checkFoulOut(defFouler, def);
      const clockBefore = G.clock;

      if (def.teamFouls >= 10) {
        log(`Foul on ${defFouler.name} — ${foulDesc(defFouler, def)} — ${fouledPlayer.name} to shoot two`, 'foul');
        resolveFreeThrows(fouledPlayer, off, def, 2);
        checkMediaTimeout(clockBefore, 'non_shooting_foul');
        return false;
      } else if (def.teamFouls >= 7) {
        log(`Foul on ${defFouler.name} — ${foulDesc(defFouler, def)} — ${fouledPlayer.name} to shoot one-and-one`, 'foul');
        resolveOneAndOne(fouledPlayer, off, def);
        checkMediaTimeout(clockBefore, 'non_shooting_foul');
        return false;
      } else {
        log(`Foul on ${defFouler.name} — ${foulDesc(defFouler, def)} — ${off.name} retains`, 'foul');
        checkMediaTimeout(clockBefore, 'non_shooting_foul');
        if (retryDepth < 3) return runPossession(isOrb, retryDepth + 1);
        return false;
      }
    }

    // ── Step 1: Steal check ─────────────────────────────────────
    for (const d of def.lineup) {
      const chance = perPossessionChance(sd(d.steals_per_100,'steals_per_100'), def.possessions_per_game) * mods.steal_chance_mod;
      if (Math.random() < chance) {
        const victim = weightedRandom(off.lineup, off.lineup.map(p => sd(p.turnovers_per_100,'turnovers_per_100')));
        G.stats[d.name].stl++;
        G.stats[victim.name].tov++;
        log(`STEAL: ${d.name} (${def.name}) from ${victim.name} | ${G.homeScore}-${G.awayScore}`, 'steal');
        decrementClock(10);
        applyMomentumEvent(def.isHome, 2);
        switchPossession();
        return false;
      }
    }

    // ── Step 2: Turnover check ──────────────────────────────────
    for (const p of off.lineup) {
      const chance = perPossessionChance(sd(p.turnovers_per_100,'turnovers_per_100'), off.possessions_per_game) * 0.55 * mods.turnover_chance_mod;
      if (Math.random() < chance) {
        G.stats[p.name].tov++;
        const clockBefore = G.clock;
        log(`TURNOVER: ${p.name} (${off.name}) | ${G.homeScore}-${G.awayScore}`, 'tov');
        decrementClock(10);
        checkMediaTimeout(clockBefore, 'turnover');
        switchPossession();
        return false;
      }
    }

    // ── Step 3: Shooter ─────────────────────────────────────────
    const shooter = selectShooter(off.lineup, mods);

    // ── Step 5: Shot type ────────────────────────────────────────
    const threeRate = clamp(shooter.three_pa_rate + mods.three_pa_rate_mod, 0, 1);
    const isThree = Math.random() < threeRate;
    const clockCost = isOrb ? 11 : 17;

    // ── Step 5b: Block check ─────────────────────────────────────
    const block = checkBlock(def);
    if (block.occurred) {
      decrementClock(clockCost);
      return resolveBlockedShot(shooter, block.blocker, off, def, isThree);
    }

    // ── Step 6: Shot outcome ─────────────────────────────────────
    const base = isThree
      ? sd(shooter.three_point_pct, 'three_point_pct')
      : sd(shooter.two_point_pct, 'two_point_pct');
    let pct = base;
    pct += isThree ? mods.three_pt_pct_mod : mods.two_pt_pct_mod;
    if (off.isHome) pct += off.home_fg_bonus;
    pct += getMomentumMod(off.isHome);
    pct = clamp(pct, 0.05, 0.95);
    const shotMade = Math.random() < pct;

    // ── Made basket ──────────────────────────────────────────────
    if (shotMade) {
      const isDunk = !isThree && Math.random() < (shooter.position==='C' ? 0.18 : shooter.position==='F' ? 0.10 : 0.03);
      const pts = isThree ? 3 : 2;

      if (off.isHome) G.homeScore += pts; else G.awayScore += pts;
      G.stats[shooter.name].fga++;
      G.stats[shooter.name].fgm++;
      G.stats[shooter.name].pts += pts;
      if (isThree) { G.stats[shooter.name].tpa++; G.stats[shooter.name].tpm++; }

      const clockBefore = G.clock;
      decrementClock(clockCost);

      const gain = (isDunk || isThree) ? 2 : 0;
      applyMomentumBasket(off.isHome, gain);
      updateRun(off.isHome, pts);

      const label = isDunk ? 'DUNK' : isThree ? '3-PTR' : '2-PTR';
      // Assist crediting — driven by team assist_rate, individual per-100s for attribution
      let assister = null;
      if (Math.random() < (off.assist_rate || 0.54)) {
        const assistPool = off.lineup.filter(p => p !== shooter);
        if (assistPool.length) {
          assister = weightedRandom(assistPool,
            assistPool.map(p => sd(p.assists_per_100, 'assists_per_100')));
          G.stats[assister.name].ast++;
        }
      }
      const assist = assister ? ` (${assister.name})` : '';
      const evType = isDunk ? 'dunk' : isThree ? 'three' : 'make';
      log(`${label}: ${shooter.name}${assist} (${off.name}) | ${G.homeScore}-${G.awayScore}`, evType);

      // And-one check
      const foul = checkShootingFoul(def.lineup, shooter, def);
      if (foul.occurred) {
        log(`  And-one! ${shootFoulDesc(foul.fouler, def, shooter, 'one')}`, 'foul');
        resolveFreeThrows(shooter, off, def, 1);
        checkMediaTimeout(clockBefore, 'shooting_foul');
      } else {
        switchPossession();
      }
      return false;
    }

    // ── Missed shot ──────────────────────────────────────────────
    G.stats[shooter.name].fga++;
    if (isThree) G.stats[shooter.name].tpa++;

    const foul = checkShootingFoul(def.lineup, shooter, def);
    const clockBefore = G.clock;
    decrementClock(clockCost);

    if (foul.occurred) {
      // Shot nullified — undo the FGA we just counted
      G.stats[shooter.name].fga--;
      if (isThree) G.stats[shooter.name].tpa--;
      const ftCount = isThree ? 3 : 2;
      const ftDesc = ftCount === 3 ? 'three' : 'two';
      log(`${shootFoulDesc(foul.fouler, def, shooter, ftDesc)}`, 'foul');
      resolveFreeThrows(shooter, off, def, ftCount);
      checkMediaTimeout(clockBefore, 'shooting_foul');
      return false;
    }

    log(`MISS: ${shooter.name} (${isThree?'3':'2'}pt, ${off.name}) | ${G.homeScore}-${G.awayScore}`, 'miss');
    const gotOrb = resolveRebound(off, def, isThree);
    // If offensive rebound: next possession uses 8s clock (isOrb=true)
    // resolveRebound already handled possession switch for defensive rebound
    return gotOrb;
  }

  // ═══════════════════════════════════════════════════════════════
  // GAME RUNNER
  // ═══════════════════════════════════════════════════════════════

  function setupHalf(halfLabel) {
    G.half = halfLabel;
    const isOT = typeof halfLabel === 'string' && halfLabel.startsWith('OT');
    G.clock = isOT ? 300 : 1200;
    G.momentum = 0;
    G.home.teamFouls = 0;
    G.away.teamFouls = 0;
    G.halfPossessions = 0;
    if (isOT) {
      G.mediaTimeouts = [];
      G.homeTimeouts = 1;
      G.awayTimeouts = 1;
    } else {
      G.mediaTimeouts = [960, 720, 480, 240];
      G.homeTimeouts = 3;
      G.awayTimeouts = 3;
    }
    const label = isOT ? halfLabel : (halfLabel === 1 ? 'FIRST HALF' : 'SECOND HALF');
    log(`══════════════ ${label} ══════════════`, 'info');
  }

  function runHalf() {
    let isOrb = false;
    while (G.clock > 0) {
      isOrb = runPossession(isOrb) || false;
      G.halfPossessions++;
    }
    log(`══════ End: ${G.home.name} ${G.homeScore}  ${G.away.name} ${G.awayScore} ══════`, 'info');
  }

  function runOneGame(homeData, awayData) {
    initGame(homeData, awayData);
    BoxScore.init(G.home, G.away, 'exhibition', null, BoxScore.LOG_LEVELS.OFF);
    setupHalf(1); runHalf();
    setupHalf(2); runHalf();
    let otNum = 0;
    while (G.homeScore === G.awayScore && otNum < 5) { otNum++; setupHalf('OT'+otNum); runHalf(); }
    BoxScore.save([]); // TODO Phase 5: wire actual eventQueue here when SUMMARY logging is needed
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    runOneGame,
    get G()   { return G;   },
    get pbp() { return pbp; },
  };

})();
