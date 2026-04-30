// tournament.js
// window.Tournament — bracket generator, data model, and state manager.
// Pure data and logic — no UI dependencies.
// Depends on: window.TEAMS (flat team array from data/teams-data.js)
// Storage: localStorage key 'tournament:current'

window.Tournament = (function () {
  'use strict';

  const STORAGE_KEY = 'tournament:current';
  const REGIONS = ['East', 'South', 'Midwest', 'West'];

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

    // ── User team guarantee ───────────────────────────────────────────────────
    // If the user team didn't land in the 64-team field (no net_rating or fell
    // outside the tier cuts), force them in at their natural seed tier by
    // displacing the weakest occupant at that seed line.
    if (!seededField.find(e => e.teamId === userTeamId)) {
      const allRated = (window.TEAMS || [])
        .filter(t => t.net_rating != null)
        .sort((a, b) => b.net_rating - a.net_rating);

      const rankIdx = allRated.findIndex(t => t.id === userTeamId); // -1 if unrated
      const rank    = rankIdx >= 0 ? rankIdx + 1 : allRated.length + 1;

      // Map rank → natural seed using the same tier boundaries as buildSeededField
      let naturalSeed;
      if      (rank <= 16) naturalSeed = Math.ceil(rank / 4);
      else if (rank <= 32) naturalSeed = 4  + Math.ceil((rank - 16) / 4);
      else if (rank <= 52) naturalSeed = 8  + Math.ceil((rank - 32) / 4);
      else                 naturalSeed = Math.min(16, 13 + Math.ceil((rank - 52) / 4));

      // Among the four regions at that seed, pick the one whose occupant has
      // the lowest net_rating (weakest team gets bumped).
      const slotTeams = (window.TEAMS || []);
      const candidates = seededField
        .filter(e => e.seed === naturalSeed)
        .slice()
        .sort((a, b) => {
          const ra = slotTeams.find(t => t.id === a.teamId)?.net_rating ?? -Infinity;
          const rb = slotTeams.find(t => t.id === b.teamId)?.net_rating ?? -Infinity;
          return ra - rb; // ascending — weakest first
        });

      const victim   = candidates[0];
      const userTeam = slotTeams.find(t => t.id === userTeamId);
      if (victim) {
        victim.teamId     = userTeamId;
        victim.conference = userTeam?.conference ?? null;
      }
    }
    // ── End user team guarantee ───────────────────────────────────────────────

    const userEntry = seededField.find(e => e.teamId === userTeamId);

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
   * finals (round 4) are complete. Pairings: East vs West, South vs Midwest.
   */
  function generateFinalFour(state) {
    // All four regional finals must be complete
    for (const region of REGIONS) {
      const rf = state.games.find(g => g.region === region && g.round === 4);
      if (!rf || rf.winnerId === null) return state;
    }
    if (state.games.some(g => g.round === 5)) return state; // already generated

    const pairs = [['East', 'West'], ['South', 'Midwest']];
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

  /**
   * Generate a tournament bracket seeded from a completed season.
   * @param {string}   p1TeamId       — the player's team id
   * @param {Array}    conferenceBids — bid objects from SeasonEngine.getConferenceTournamentBids()
   *                                    Each: { teamId, seed, region } (seed/region may be null for at-large)
   * @returns {object} tournament state (also persisted to localStorage)
   */
  function generateFromSeason(p1TeamId, conferenceBids) {
    const ALL_SEEDS = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

    // Place pre-seeded conference bids (those with seed + region assigned)
    const occupied   = {};   // key `Region:seed` → teamId
    const placedIds  = new Set();

    for (const bid of conferenceBids) {
      if (bid.region && bid.seed) {
        const key = bid.region + ':' + bid.seed;
        if (!occupied[key]) {
          occupied[key] = bid.teamId;
          placedIds.add(bid.teamId);
        }
      }
      // at-large bids (null seed/region) fall through to the filler pool below
    }

    // Build empty-slot list sorted seed-ascending then region-order
    const emptySlots = [];
    for (let s = 1; s <= 16; s++) {
      for (const region of REGIONS) {
        if (!occupied[region + ':' + s]) emptySlots.push({ region, seed: s });
      }
    }

    // Fill empty slots with top-rated unplaced teams (includes at-large conf bids)
    const filler = (window.TEAMS || [])
      .filter(t => t.net_rating != null && !placedIds.has(t.id))
      .sort((a, b) => b.net_rating - a.net_rating);

    for (let i = 0; i < emptySlots.length && i < filler.length; i++) {
      const slot = emptySlots[i];
      occupied[slot.region + ':' + slot.seed] = filler[i].id;
    }

    // Build seededField in standard format
    const seededField = [];
    for (const region of REGIONS) {
      for (const seed of ALL_SEEDS) {
        const teamId = occupied[region + ':' + seed];
        if (teamId) {
          const team = (window.TEAMS || []).find(t => t.id === teamId);
          seededField.push({ teamId, seed, region, conference: team ? team.conference : null });
        }
      }
    }

    // Safety: guarantee p1 team is in the bracket
    if (!seededField.find(e => e.teamId === p1TeamId)) {
      const p1Team   = (window.TEAMS || []).find(t => t.id === p1TeamId);
      const weakest  = seededField
        .filter(e => e.seed >= 14)
        .sort((a, b) => {
          const ra = (window.TEAMS || []).find(t => t.id === a.teamId);
          const rb = (window.TEAMS || []).find(t => t.id === b.teamId);
          return (ra ? ra.net_rating || -99 : -99) - (rb ? rb.net_rating || -99 : -99);
        })[0];
      if (weakest) {
        weakest.teamId     = p1TeamId;
        weakest.conference = p1Team ? p1Team.conference : null;
      }
    }

    const userEntry = seededField.find(e => e.teamId === p1TeamId);
    const state = {
      id:           'tournament-' + Date.now(),
      userTeamId:   p1TeamId,
      userRegion:   userEntry ? userEntry.region : null,
      userSeed:     userEntry ? userEntry.seed   : null,
      seededField,
      games:        buildRound1Games(seededField, p1TeamId),
      currentRound: 1,
      status:       'active',
      fromSeason:   true,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  /** Remove tournament state from localStorage. */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return {
    generate,
    generateFromSeason,
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
