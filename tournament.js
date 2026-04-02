// tournament.js
// window.Tournament — bracket generator, data model, and state manager.
// Pure data and logic — no UI dependencies.
// Depends on: window.TEAMS (flat team array from data/teams-data.js)
// Storage: localStorage key 'tournament:current'

window.Tournament = (function () {
  'use strict';

  const STORAGE_KEY = 'tournament:current';
  const REGIONS = ['East', 'Southeast', 'Midwest', 'West'];

  // Round 1 bracket order: [higher seed, lower seed]
  // Produces the standard top-to-bottom bracket pairing.
  const R1_MATCHUPS = [
    [1, 16], [8, 9], [5, 12], [4, 13],
    [3, 14], [6, 11], [7, 10], [2, 15],
  ];

  // ── Utilities ──────────────────────────────────────────────────────────────

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function gameId(round, region, index) {
    return `${region.toLowerCase().replace(/\s+/g, '_')}-r${round}-g${index + 1}`;
  }

  // ── Seeding algorithm ──────────────────────────────────────────────────────
  //
  // Sort all rated teams by net_rating descending, then partition into tiers:
  //   Tier A: ranks  1–16  → seeds 1–4   (16 teams, 4 per seed)
  //   Tier B: ranks 17–32  → seeds 5–8   (16 teams, 4 per seed)
  //   Tier C: ranks 33..n-20, take 20    → seeds 9–13 (20 teams, 4 per seed)
  //   Tier D: last 20, take 12           → seeds 14–16 (12 teams, 4 per seed)
  //
  // Each tier is shuffled before assignment so seeding has variance.
  // Teams within a tier group are assigned one per region in REGIONS order.

  function buildSeededField() {
    const teams = (window.TEAMS || [])
      .filter(t => t.net_rating != null)
      .sort((a, b) => b.net_rating - a.net_rating);
    const n = teams.length;

    const tierA = shuffle(teams.slice(0, 16));
    const tierB = shuffle(teams.slice(16, 32));
    const tierC = shuffle(teams.slice(32, n - 20).slice(0, 20));
    const tierD = shuffle(teams.slice(n - 20).slice(0, 12));

    const seeded = [];

    // For each tier, groups of 4 correspond to a seed number (one team per region).
    function assignTier(pool, seedStart, numSeeds) {
      for (let s = 0; s < numSeeds; s++) {
        for (let r = 0; r < 4; r++) {
          const team = pool[s * 4 + r];
          seeded.push({
            teamId:     team.id,
            seed:       seedStart + s,
            region:     REGIONS[r],
            conference: team.conference,
          });
        }
      }
    }

    assignTier(tierA, 1,  4); // seeds  1–4
    assignTier(tierB, 5,  4); // seeds  5–8
    assignTier(tierC, 9,  5); // seeds  9–13
    assignTier(tierD, 14, 3); // seeds 14–16

    // Conference check for seed 2: if seed-2 shares a conference with seed-1 in
    // the same region, swap that seed-2 with another region's seed-2 (provided
    // the swap doesn't create a new same-conference pairing in either region).
    for (const region of REGIONS) {
      const s1 = seeded.find(e => e.seed === 1 && e.region === region);
      const s2 = seeded.find(e => e.seed === 2 && e.region === region);
      if (!s1 || !s2 || s1.conference !== s2.conference) continue;

      const swapTarget = REGIONS
        .filter(r => r !== region)
        .map(r => seeded.find(e => e.seed === 2 && e.region === r))
        .find(candidate => {
          if (!candidate) return false;
          const peer1 = seeded.find(e => e.seed === 1 && e.region === candidate.region);
          // Ensure the swap doesn't create a same-conf pairing in the other region
          return candidate.conference !== s1.conference &&
                 s2.conference !== peer1?.conference;
        });

      if (swapTarget) {
        [s2.teamId,     swapTarget.teamId]     = [swapTarget.teamId,     s2.teamId];
        [s2.conference, swapTarget.conference] = [swapTarget.conference, s2.conference];
      }
    }

    return seeded;
  }

  // ── Bracket construction ───────────────────────────────────────────────────

  function buildRound1Games(seededField, userTeamId) {
    const games = [];
    for (const region of REGIONS) {
      const regionTeams = seededField.filter(e => e.region === region);
      R1_MATCHUPS.forEach(([s1, s2], idx) => {
        const home = regionTeams.find(e => e.seed === s1);
        const away = regionTeams.find(e => e.seed === s2);
        const homeTeamId = home?.teamId ?? null;
        const awayTeamId = away?.teamId ?? null;
        games.push({
          id:          gameId(1, region, idx),
          round:       1,
          region,
          homeTeamId,
          awayTeamId,
          homeScore:   null,
          awayScore:   null,
          winnerId:    null,
          isPlayerGame: homeTeamId === userTeamId || awayTeamId === userTeamId,
        });
      });
    }
    return games;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Generate a new 64-team tournament bracket.
   * @param {string} userTeamId  — the player's team id (e.g. 'kansas')
   * @returns {object} tournament state object (also persisted to localStorage)
   */
  function generate(userTeamId) {
    const seededField = buildSeededField();
    const userEntry   = seededField.find(e => e.teamId === userTeamId);

    const state = {
      id:           `tournament-${Date.now()}`,
      userTeamId,
      userRegion:   userEntry?.region ?? null,
      userSeed:     userEntry?.seed   ?? null,
      seededField,
      games:        buildRound1Games(seededField, userTeamId),
      currentRound: 1,
      status:       'active',
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  /** Load tournament state from localStorage. Returns null if none exists. */
  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  /** Persist tournament state to localStorage. */
  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /** Look up a team object by id from window.TEAMS. */
  function getTeam(teamId) {
    return (window.TEAMS || []).find(t => t.id === teamId) ?? null;
  }

  /**
   * Record the result of a game and persist.
   * @param {object} state      — tournament state (mutated in place)
   * @param {string} gId        — game id string
   * @param {number} homeScore
   * @param {number} awayScore
   * @returns {object} updated state
   */
  function recordResult(state, gId, homeScore, awayScore) {
    const game = state.games.find(g => g.id === gId);
    if (!game) return state;
    game.homeScore = homeScore;
    game.awayScore = awayScore;
    game.winnerId  = homeScore > awayScore ? game.homeTeamId : game.awayTeamId;
    save(state);
    return state;
  }

  /**
   * Once all games in the current round for a region are complete, generate
   * the next round's games for that region (rounds 1–3 produce rounds 2–4).
   * No-ops if games are incomplete or round 4 is already the max (use
   * generateFinalFour for the transition to round 5).
   */
  function generateNextRound(state, region) {
    const regionGames = state.games.filter(g => g.region === region);
    if (!regionGames.length) return state;

    const maxRound = Math.max(...regionGames.map(g => g.round));
    if (maxRound >= 4) return state; // regional done

    const current = regionGames.filter(g => g.round === maxRound);
    if (current.some(g => g.winnerId === null)) return state; // not all done

    const winners   = current.map(g => g.winnerId);
    const nextRound = maxRound + 1;

    for (let i = 0; i < winners.length; i += 2) {
      const idx = state.games.filter(g => g.region === region && g.round === nextRound).length;
      state.games.push({
        id:          gameId(nextRound, region, idx),
        round:       nextRound,
        region,
        homeTeamId:  winners[i],
        awayTeamId:  winners[i + 1],
        homeScore:   null,
        awayScore:   null,
        winnerId:    null,
        isPlayerGame: winners[i] === state.userTeamId || winners[i + 1] === state.userTeamId,
      });
    }

    save(state);
    return state;
  }

  /**
   * Generate the two Final Four matchups (round 5) once all four regional
   * finals (round 4) are complete. Pairings: East vs West, Southeast vs Midwest.
   */
  function generateFinalFour(state) {
    // All four regional finals must be complete
    for (const region of REGIONS) {
      const rf = state.games.find(g => g.region === region && g.round === 4);
      if (!rf || rf.winnerId === null) return state;
    }
    if (state.games.some(g => g.round === 5)) return state; // already generated

    const pairs = [['East', 'West'], ['Southeast', 'Midwest']];
    pairs.forEach(([r1, r2], idx) => {
      const w1 = state.games.find(g => g.region === r1 && g.round === 4).winnerId;
      const w2 = state.games.find(g => g.region === r2 && g.round === 4).winnerId;
      state.games.push({
        id:          `final_four-r5-g${idx + 1}`,
        round:       5,
        region:      'Final Four',
        homeTeamId:  w1,
        awayTeamId:  w2,
        homeScore:   null,
        awayScore:   null,
        winnerId:    null,
        isPlayerGame: w1 === state.userTeamId || w2 === state.userTeamId,
      });
    });

    save(state);
    return state;
  }

  /**
   * Generate the Championship game (round 6) once both Final Four games
   * (round 5) are complete.
   */
  function generateChampionship(state) {
    const ff = state.games.filter(g => g.round === 5);
    if (ff.length !== 2 || ff.some(g => g.winnerId === null)) return state;
    if (state.games.some(g => g.round === 6)) return state;

    const w1 = ff[0].winnerId;
    const w2 = ff[1].winnerId;
    state.games.push({
      id:          'championship-r6-g1',
      round:       6,
      region:      'Championship',
      homeTeamId:  w1,
      awayTeamId:  w2,
      homeScore:   null,
      awayScore:   null,
      winnerId:    null,
      isPlayerGame: w1 === state.userTeamId || w2 === state.userTeamId,
    });

    save(state);
    return state;
  }

  /**
   * Return all games for a given round, optionally filtered by region.
   * @param {object} state
   * @param {number} round  — 1–6
   * @param {string} [region] — optional region filter
   */
  function getRoundGames(state, round, region) {
    return state.games.filter(g =>
      g.round === round && (!region || g.region === region)
    );
  }

  /**
   * Returns true if the user's team has been eliminated (lost a game they
   * were in).
   */
  function isEliminated(state) {
    return state.games.some(g =>
      (g.homeTeamId === state.userTeamId || g.awayTeamId === state.userTeamId) &&
      g.winnerId !== null &&
      g.winnerId !== state.userTeamId
    );
  }

  /** Remove tournament state from localStorage. */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    generate,
    load,
    save,
    getTeam,
    recordResult,
    generateNextRound,
    generateFinalFour,
    generateChampionship,
    getRoundGames,
    isEliminated,
    clear,
  };

})();
