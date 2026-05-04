// season_engine.js
// Defines window.SeasonEngine — season creation, scheduling, and state management.
// Depends on window.Store and window.TEAMS. Loaded after stats_engine.js in index.html.

window.SeasonEngine = (() => {

  // ── Game dates (ordinal lookup table) ────────────────────────────────────────
  // Indices  0-11: non-conference games (Nov 20 – Dec 21)
  // Indices 12-31: conference games     (Jan 2  – Mar 11)

  const GAME_DATES = [
    'Nov 20', 'Nov 23', 'Nov 26', 'Nov 29',
    'Dec 2',  'Dec 5',  'Dec 8',  'Dec 11',
    'Dec 14', 'Dec 17', 'Dec 20', 'Dec 21',
    'Jan 2',  'Jan 6',  'Jan 9',  'Jan 13',
    'Jan 17', 'Jan 20', 'Jan 24', 'Jan 27',
    'Jan 31', 'Feb 3',  'Feb 7',  'Feb 10',
    'Feb 14', 'Feb 17', 'Feb 21', 'Feb 24',
    'Feb 28', 'Mar 5',  'Mar 8',  'Mar 11',
  ];

  // ── Conference tournament seeding ────────────────────────────────────────────
  //
  // Maps conference name → { region, seeds[] }
  // seeds[i] is the NCAA seed awarded to the team that finished (i+1)th in conf.
  // ACC and Big East share the East region (ACC seeds 1,4,5,8,9,12 —
  // Big East seeds 2,3,6,7,10,11); the other major conferences each own their region.
  // Conferences not listed here receive 2 at-large bids (no pre-assigned slot).

  // Conference champion region and per-finish-rank seed assignments.
  // Duplicate seeds (e.g. Big Ten's two 5s) go to different regions via the
  // cycle in getConferenceTournamentBids.
  const CONFERENCE_TOURNAMENT_SEEDS = {
    'ACC':      { region: 'East',    seeds: [1, 3, 5, 6, 7, 8, 9] },
    'Big Ten':  { region: 'Midwest', seeds: [1, 2, 4, 5, 5, 6, 7, 8, 8] },
    'Big East': { region: 'East',    seeds: [1, 3, 6, 8, 9] },
    'Big 12':   { region: 'South',   seeds: [1, 3, 4, 6, 7, 7, 8, 9] },
    'SEC':      { region: 'West',    seeds: [1, 3, 5, 6, 7, 8, 9] },
  };

  // Returns an array of bid objects for teams in `standings` that earned a
  // tournament invitation. Each object: { teamId, teamName, conference, seed, region }.
  // seed/region are null for at-large bids (conferences not in the table).
  //
  // Region cycle: conference champion → homeRegion. Subsequent bids cycle through
  // [homeRegion, <other 3 in canonical East→Midwest→South→West order>] so that
  // teams with duplicate seed numbers land in different regions.
  function getConferenceTournamentBids(conference, standings) {
    const config = CONFERENCE_TOURNAMENT_SEEDS[conference];
    if (!config) {
      // Small / independent conference: top 2 teams earn at-large bids
      return standings.slice(0, 2).map(row => ({
        teamId: row.teamId, teamName: row.teamName,
        conference, seed: null, region: null,
      }));
    }

    // Build region cycle: homeRegion first, then the other three in canonical order.
    const CANONICAL = ['East', 'Midwest', 'South', 'West'];
    const cycleRegions = [config.region, ...CANONICAL.filter(r => r !== config.region)];

    return standings.slice(0, config.seeds.length).map((row, i) => ({
      teamId:   row.teamId,
      teamName: row.teamName,
      conference,
      seed:     config.seeds[i],
      region:   cycleRegions[i % 4],
    }));
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  let _lastCompleted = null;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getTeams() {
    return (window.TEAMS || []).map(t => ({ ...t, id: _normalizeId(t.id) }));
  }

  function _normalizeId(id) {
    return (id || '').toLowerCase().replace(/\s+/g, '-');
  }

  function _toHyphen(id) {
    return (id || '').replace(/_/g, '-');
  }

  // ── Master conference schedule builder ───────────────────────────────────────
  //
  // Uses standard round-robin rotation (fix one team, rotate the rest) to
  // schedule every conference matchup, then adds rematches so every real team
  // reaches exactly 18 conference games.
  //
  // Each game is assigned roundIndex = 12 + r (its absolute GAME_DATES index).
  // Odd-sized conferences get a virtual Idle placeholder; Idle matchups are discarded.

  function _buildConferenceSchedule(conferenceTeams) {
    // ── Setup: pad to even count with Idle placeholder ────────────────────────
    let teams = conferenceTeams.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (teams.length % 2 !== 0) {
      teams = [...teams, { id: 'Idle', name: 'Idle' }];
    }
    const N = teams.length; // always even

    // ── Standard round-robin: fix teams[0], rotate teams[1..N-1] ─────────────
    // N-1 rounds; each round produces N/2 pairs (one may be Idle, which is skipped).
    // Guarantees each team appears at most once per round.
    const rotating      = teams.slice(1);
    const firstMeetings = []; // { home, away, roundIndex }

    // Track which roundIndex slots each team already occupies
    const teamSlots = {}; // normalizedId → Set<roundIndex>
    const claimSlot = (id, ri) => {
      if (!teamSlots[id]) teamSlots[id] = new Set();
      teamSlots[id].add(ri);
    };

    for (let r = 0; r < N - 1; r++) {
      const arrangement = [teams[0]];
      for (let i = 0; i < N - 1; i++) {
        arrangement.push(rotating[(i + r) % (N - 1)]);
      }

      const roundIndex = 12 + r;

      for (let i = 0; i < N / 2; i++) {
        const teamA = arrangement[i];
        const teamB = arrangement[N - 1 - i];
        if (teamA.id === 'Idle' || teamB.id === 'Idle') continue;

        const homeTeam = (r + i) % 2 === 0 ? teamA : teamB;
        const awayTeam = (r + i) % 2 === 0 ? teamB : teamA;
        const idH = _normalizeId(homeTeam.id);
        const idA = _normalizeId(awayTeam.id);

        firstMeetings.push({
          home:       { id: idH, name: homeTeam.name },
          away:       { id: idA, name: awayTeam.name },
          roundIndex,
        });
        claimSlot(idH, roundIndex);
        claimSlot(idA, roundIndex);
      }
    }

    // ── Rematches: bring every real team to exactly 18 conf games ─────────────
    const firstMeetingCount = {};
    for (const g of firstMeetings) {
      firstMeetingCount[g.home.id] = (firstMeetingCount[g.home.id] || 0) + 1;
      firstMeetingCount[g.away.id] = (firstMeetingCount[g.away.id] || 0) + 1;
    }

    // Pass 2 — same rotation, home/away flipped, roundIndex starts at 12 + (N-1)
    const rematches = [];
    const rematchGameCounts = {};
    for (const t of conferenceTeams) {
      rematchGameCounts[_normalizeId(t.id)] = 0;
    }

    for (let r = 0; r < N - 1; r++) {
      const arrangement = [teams[0]];
      for (let i = 0; i < N - 1; i++) {
        arrangement.push(rotating[(i + r) % (N - 1)]);
      }
      const roundIndex = 12 + (N - 1) + r;
      if (roundIndex > GAME_DATES.length - 1) break;

      for (let i = 0; i < N / 2; i++) {
        const teamA = arrangement[i];
        const teamB = arrangement[N - 1 - i];
        if (teamA.id === 'Idle' || teamB.id === 'Idle') continue;

        const idA = _normalizeId(teamA.id);
        const idB = _normalizeId(teamB.id);

        // Skip if either team already has 18 games
        const totalA = (firstMeetingCount[idA] || 0) + (rematchGameCounts[idA] || 0);
        const totalB = (firstMeetingCount[idB] || 0) + (rematchGameCounts[idB] || 0);
        if (totalA >= 18 || totalB >= 18) continue;

        // Flip home/away from Pass 1
        const homeTeam = (r + i) % 2 === 0 ? teamB : teamA;
        const awayTeam = (r + i) % 2 === 0 ? teamA : teamB;
        const idH  = _normalizeId(homeTeam.id);
        const idAw = _normalizeId(awayTeam.id);

        rematches.push({
          home: { id: idH,  name: homeTeam.name },
          away: { id: idAw, name: awayTeam.name },
          roundIndex,
        });
        claimSlot(idH,  roundIndex);
        claimSlot(idAw, roundIndex);
        rematchGameCounts[idA]++;
        rematchGameCounts[idB]++;
      }
    }

    // ── Validation ────────────────────────────────────────────────────────────
    const allGames    = [...firstMeetings, ...rematches];
    const gameCounts  = {};
    for (const g of allGames) {
      gameCounts[g.home.id] = (gameCounts[g.home.id] || 0) + 1;
      gameCounts[g.away.id] = (gameCounts[g.away.id] || 0) + 1;
    }
    for (const t of conferenceTeams) {
      const id  = _normalizeId(t.id);
      const cnt = gameCounts[id] || 0;
      if (cnt !== 18) {
        console.warn(`[_buildConferenceSchedule] ${t.name} has ${cnt} conf games (expected 18)`);
      }
    }
    console.log(
      `[_buildConferenceSchedule] ${conferenceTeams.length}-team conf:`,
      allGames.length, 'total games | per-team:',
      Object.entries(gameCounts).map(([id, n]) => `${id}:${n}`).join(', ')
    );

    // ── Build output ──────────────────────────────────────────────────────────
    return allGames
      .sort((a, b) => a.roundIndex - b.roundIndex)
      .map((g, idx) => ({
        gameId:     'cg_' + idx,
        date:       GAME_DATES[g.roundIndex],
        roundIndex: g.roundIndex,
        homeTeamId: g.home.id,
        homeName:   g.home.name,
        awayTeamId: g.away.id,
        awayName:   g.away.name,
        status:     'pending',
        result:     null,
      }));
  }

  // ── Non-conference schedules for all non-user conference teams ───────────────
  //
  // For every conference team except the user, generates 12 non-conference
  // games (6 home, 6 away) from teams outside the user's conference.
  // gameIndex (0-11) maps to GAME_DATES[gameIndex].

  // ── _buildAllNonConfCoordinated ───────────────────────────────────────────────
  //
  // Assigns all non-conf opponents for every conference team (including the user)
  // in a single coordinated pass. A reservation table (one Set per date slot)
  // prevents the same opponent from appearing in two games on the same date,
  // which would produce duplicate box scores and uneven GP counts.
  //
  // Slot layout (gameIndex 0-11):
  //   P5 home:  0,1,2   P5 away:  3,4,5
  //   Ind home: 6,7,8   Ind away: 9,10,11
  //
  // Returns { nonConfGames, userNcSlots }
  //   nonConfGames — flat array of game objects for all non-user conf teams
  //   userNcSlots  — 12 pre-built slot objects for the user's schedule

  function _buildAllNonConfCoordinated(conferenceTeams, userTeam) {
    const confIds = new Set(conferenceTeams.map(t => t.id));

    const p5Pool  = getTeams().filter(t =>
      !confIds.has(t.id) && t.type !== 'independent'
    );
    const indPool = getTeams().filter(t =>
      t.type === 'independent'
    );

    // One reserved-opponent Set per date slot (indices 0-11)
    const reserved = Array.from({ length: 12 }, () => new Set());

    // Pick opponents from pool into the given slots, respecting both the
    // date-reservation table (no opponent twice on the same date across all
    // teams) and the per-team usedByTeam Set (no opponent twice for the same
    // team across all four pick calls).
    function pickWithReservation(pool, slots, usedByTeam) {
      const picked = [];
      for (const slot of slots) {
        let candidates = pool.filter(t =>
          !reserved[slot].has(t.id) && !usedByTeam.has(t.id)
        );
        if (candidates.length === 0)
          candidates = pool.filter(t => !usedByTeam.has(t.id));
        if (candidates.length === 0)
          candidates = pool.slice();
        const opp = candidates[Math.floor(Math.random() * candidates.length)];
        picked.push({ slot, opp });
        reserved[slot].add(opp.id);
        usedByTeam.add(opp.id);
      }
      return picked;
    }

    const nonConfGames = [];
    let   userNcSlots  = null;

    for (const team of shuffle(conferenceTeams)) {
      const tid        = _normalizeId(team.id);
      // Shared across all four picks so the same opponent is never assigned
      // to both a home slot and an away slot for the same team.
      const usedByTeam = new Set();

      const p5Home  = pickWithReservation(p5Pool,  [0, 1, 2],    usedByTeam);
      const p5Away  = pickWithReservation(p5Pool,  [3, 4, 5],    usedByTeam);
      const indHome = pickWithReservation(indPool, [6, 7, 8],    usedByTeam);
      const indAway = pickWithReservation(indPool, [9, 10, 11],  usedByTeam);

      const allPicks = [...p5Home, ...p5Away, ...indHome, ...indAway];
      // p5Home/indHome → team is home; p5Away/indAway → team is away
      const homeSet = new Set([...p5Home, ...indHome].map(x => x.slot));

      if (team.id === userTeam.id) {
        // Build slot objects for the user's personal schedule
        userNcSlots = allPicks.map(({ slot, opp }) => {
          const userIsHome = homeSet.has(slot);
          return {
            gameIndex:  slot,
            date:       GAME_DATES[slot],
            homeTeamId: userIsHome ? tid              : _normalizeId(opp.id),
            homeName:   userIsHome ? team.name        : opp.name,
            awayTeamId: userIsHome ? _normalizeId(opp.id) : tid,
            awayName:   userIsHome ? opp.name         : team.name,
            conference: 'nonconf',
            status:     'pending',
            result:     null,
          };
        }).sort((a, b) => a.gameIndex - b.gameIndex);
      } else {
        // Build game objects for the master non-conf schedule
        allPicks.forEach(({ slot, opp }) => {
          const userIsHome = homeSet.has(slot);
          nonConfGames.push({
            gameId:     'ng_' + tid + '_' + slot,
            date:       GAME_DATES[slot],
            gameIndex:  slot,
            homeTeamId: userIsHome ? tid              : _normalizeId(opp.id),
            homeName:   userIsHome ? team.name        : opp.name,
            awayTeamId: userIsHome ? _normalizeId(opp.id) : tid,
            awayName:   userIsHome ? opp.name         : team.name,
            teamId:     tid,
            status:     'pending',
            result:     null,
          });
        });
      }
    }

    return { nonConfGames, userNcSlots };
  }

  // ── SeasonEngine._buildUnifiedSchedule ────────────────────────────────────────
  //
  // Combines conference and non-conference games for ALL teams into one flat array.
  // Every entry has isUserGame:true when P1 is involved.

  function _buildUnifiedSchedule(conferenceTeams, userTeam) {
    const uid = userTeam.id;

    const confGames = _buildConferenceSchedule(conferenceTeams);
    const { nonConfGames, userNcSlots } = _buildAllNonConfCoordinated(
      conferenceTeams, userTeam
    );

    const unified = [];

    for (const g of confGames) {
      unified.push({
        gameId:     g.gameId,
        roundIndex: g.roundIndex,
        date:       g.date,
        homeTeamId: g.homeTeamId,
        homeName:   g.homeName,
        awayTeamId: g.awayTeamId,
        awayName:   g.awayName,
        conference: 'conference',
        isUserGame: g.homeTeamId === uid || g.awayTeamId === uid,
        status:     'pending',
        result:     null,
      });
    }

    for (const g of userNcSlots) {
      unified.push({
        gameId:     'unc_' + g.gameIndex,
        roundIndex: g.gameIndex,
        date:       g.date,
        homeTeamId: g.homeTeamId,
        homeName:   g.homeName,
        awayTeamId: g.awayTeamId,
        awayName:   g.awayName,
        conference: 'nonconf',
        isUserGame: true,
        status:     'pending',
        result:     null,
      });
    }

    for (const g of nonConfGames) {
      unified.push({
        gameId:     'cnc_' + g.teamId + '_' + g.gameIndex,
        roundIndex: g.gameIndex,
        date:       g.date,
        homeTeamId: g.homeTeamId,
        homeName:   g.homeName,
        awayTeamId: g.awayTeamId,
        awayName:   g.awayName,
        conference: 'nonconf',
        isUserGame: false,
        status:     'pending',
        result:     null,
      });
    }

    unified.sort((a, b) => a.roundIndex - b.roundIndex);
    return unified;
  }

  // ── SeasonEngine.create ───────────────────────────────────────────────────────

  function create(userTeamId) {
    userTeamId = _normalizeId(userTeamId);
    const userTeam = getTeams().find(t => _normalizeId(t.id) === userTeamId);
    if (!userTeam) {
      console.error(`[SeasonEngine] Team not found: "${userTeamId}"`);
      return null;
    }

    // Clear all stale season and game data before starting new season
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('season:') || key.startsWith('game:'))) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    const seasonId = 's_' + Date.now();
    const season = {
      seasonId,
      created:        new Date().toISOString().slice(0, 10),
      userTeamId:     _normalizeId(userTeam.id),
      userTeamName:   userTeam.name,
      userConference: userTeam.conference,
      totalGames:     30,
      currentGame:    0,
      status:         'active',
      schedule:       [],
    };

    // ── Build unified schedule ────────────────────────────────────────────────
    const conferenceTeams = getTeams().filter(t => t.conference === userTeam.conference);

    season.schedule = _buildUnifiedSchedule(conferenceTeams, userTeam);

    Store.set('season:active', season);
    Store.set('season:' + seasonId + ':meta', season);

    const userGameCount = season.schedule.filter(g => g.isUserGame).length;
    const totalCount    = season.schedule.length;
    console.log(
      `[CHT] Season created — ${userTeam.name} | unified schedule: ${totalCount} games (${userGameCount} user games)`
    );

    return season;
  }

  // ── SeasonEngine.getActive ────────────────────────────────────────────────────

  function getActive() {
    const season = Store.get('season:active') || null;
    if (!season) return null;

    // Discard stale pre-refactor data — unified schedule should have
    // exactly 30 user games. More than 30 means old code wrote this.
    if (season.schedule) {
      const userGameCount = season.schedule.filter(g => g.isUserGame).length;
      console.log('[getActive] userGameCount:', userGameCount, 'discarding:', userGameCount > 30);
      if (userGameCount > 30) {
        console.warn('[SeasonEngine] stale pre-refactor season detected, discarding');
        Store.del('season:active');
        return null;
      }
    }

    // One-time migration: underscore ids → hyphen ids
    if (!season._idsMigrated) {
      season.userTeamId = _toHyphen(season.userTeamId);
      for (const slot of (season.schedule || [])) {
        slot.homeTeamId = _toHyphen(slot.homeTeamId);
        slot.awayTeamId = _toHyphen(slot.awayTeamId);
      }
      season._idsMigrated = true;
      Store.set('season:active', season);
    }

    return season;
  }

  // ── SeasonEngine.getSchedule ──────────────────────────────────────────────────

  function getSchedule() {
    return getActive()?.schedule || [];
  }

  // ── SeasonEngine.getNextGame ──────────────────────────────────────────────────

  function getNextGame() {
    return (season => {
      if (!season) return null;
      return season.schedule
        .filter(g => g.isUserGame)
        .sort((a, b) => a.roundIndex - b.roundIndex)
        .find(g => g.status === 'pending') || null;
    })(getActive());
  }

  // ── SeasonEngine.recordResult ─────────────────────────────────────────────────
  //
  // Records P1's Nth game result (gameIndex = 0-based ordinal among user games).
  // Finds the slot by sorting isUserGame entries by roundIndex and indexing into that list.
  // Result is written directly onto the unified slot in season.schedule.

  function recordResult(gameIndex, result) {
    const season = getActive();
    if (!season) { console.error('[SeasonEngine] No active season'); return; }

    const userGames = season.schedule
      .filter(g => g.isUserGame)
      .sort((a, b) => a.roundIndex - b.roundIndex);

    const slot = userGames[gameIndex];

    if (!slot) {
      console.warn('[recordResult] no user slot found for gameIndex:', gameIndex);
      return;
    }

    if (slot.result) {
      console.warn('[recordResult] slot already resolved:', slot.gameId);
      return;
    }

    slot.status = result.method || 'played';
    slot.result = {
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      winnerId:  result.winnerId,
      method:    result.method,
    };

    season.currentGame++;

    Store.set('season:active', season);
    Store.set(`season:${season.seasonId}:meta`, season);

    if (season.currentGame >= 30) {
      complete(season);
    }
  }

  // ── SeasonEngine.simulateToIndex ──────────────────────────────────────────────
  //
  // Simulates all non-user pending games at or before currentRoundIndex.
  // Reads and writes directly on season.schedule (unified array).
  // No-op when window.CpuSim is unavailable (e.g. stats.html read-only context).

  function simulateToIndex(currentRoundIndex) {
    if (typeof window.CpuSim === 'undefined') return;

    const season = getActive();
    if (!season) return;

    const toSimulate = season.schedule.filter(g =>
      !g.isUserGame &&
      g.status === 'pending' &&
      g.roundIndex <= currentRoundIndex
    );

    if (toSimulate.length === 0) {
      console.log(`[CHT] simulateToIndex(${currentRoundIndex}): 0 games to simulate`);
      return;
    }

    const allTeams = getTeams();
    let simCount = 0;

    for (const game of toSimulate) {
      const homeTeam = allTeams.find(t => t.id === game.homeTeamId);
      const awayTeam = allTeams.find(t => t.id === game.awayTeamId);
      if (!homeTeam || !awayTeam) {
        console.warn('[simulateToIndex] team not found:',
          !homeTeam ? game.homeTeamId : game.awayTeamId);
        continue;
      }

      const result = CpuSim.simulateGame(homeTeam, awayTeam, {
        neutralSite: false,
        saveForStats: true,
        seasonId: season.seasonId,
      });

      game.status = 'simulated';
      game.result = {
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        winnerId:  result.winnerId,
        method:    'simulated',
      };
      simCount++;
    }

    Store.set('season:active', season);
    Store.set(`season:${season.seasonId}:meta`, season);

    console.log(`[CHT] simulateToIndex(${currentRoundIndex}): simulated ${simCount} games`);
  }

  // ── SeasonEngine.getConferenceStandings ───────────────────────────────────────
  //
  // Simulates all non-user games up to currentRoundIndex, then builds standings
  // from a single pass over season.schedule (unified array).
  //
  // Returns array sorted by conf win differential DESC, overall differential DESC.

  function getConferenceStandings(currentRoundIndex) {
    simulateToIndex(currentRoundIndex);

    const season = getActive();
    if (!season) return [];

    const confTeamIds = new Set();
    for (const g of season.schedule) {
      if (g.conference === 'conference') {
        confTeamIds.add(g.homeTeamId);
        confTeamIds.add(g.awayTeamId);
      }
    }

    const teamMap = {};
    const ensureRow = (id, name) => {
      if (!teamMap[id]) teamMap[id] = {
        teamId: id, teamName: name,
        confWins: 0, confLosses: 0,
        wins: 0, losses: 0, gp: 0,
        ptsFor: 0, ptsAgainst: 0,
      };
      return teamMap[id];
    };

    for (const game of season.schedule) {
      if (!game.result) continue;
      if (game.roundIndex > currentRoundIndex) continue;

      const { homeTeamId, awayTeamId, homeName, awayName, conference, result } = game;
      const homeWon = result.homeScore > result.awayScore;
      const isConf  = conference === 'conference';

      if (confTeamIds.has(homeTeamId)) {
        const row = ensureRow(homeTeamId, homeName);
        row.gp++;
        row.ptsFor     += result.homeScore;
        row.ptsAgainst += result.awayScore;
        if (homeWon) { row.wins++; if (isConf) row.confWins++; }
        else         { row.losses++; if (isConf) row.confLosses++; }
      }

      if (confTeamIds.has(awayTeamId)) {
        const row = ensureRow(awayTeamId, awayName);
        row.gp++;
        row.ptsFor     += result.awayScore;
        row.ptsAgainst += result.homeScore;
        if (!homeWon) { row.wins++; if (isConf) row.confWins++; }
        else          { row.losses++; if (isConf) row.confLosses++; }
      }
    }

    const rows = Object.values(teamMap)
      .filter(r => confTeamIds.has(r.teamId))
      .map(r => {
        const confGp     = r.confWins + r.confLosses;
        const confWinPct = confGp > 0 ? r.confWins / confGp : 0;
        const diff       = r.gp > 0 ? (r.ptsFor - r.ptsAgainst) / r.gp : 0;
        return {
          teamId:     r.teamId,
          teamName:   r.teamName,
          gp:         r.gp,
          wins:       r.wins,
          losses:     r.losses,
          ovWins:     r.wins,
          ovLosses:   r.losses,
          confWins:   r.confWins,
          confLosses: r.confLosses,
          confWinPct,
          diff,
          ptsFor:     r.ptsFor,
          ptsAgainst: r.ptsAgainst,
          winPct:     r.gp > 0 ? r.wins / r.gp : 0,
          ovr:        r.wins  + '-' + r.losses,
          conf:       r.confWins + '-' + r.confLosses,
        };
      })
      .sort((a, b) =>
        (b.confWins - a.confWins) || (b.confWinPct - a.confWinPct) || (b.diff - a.diff)
      );

    console.log(`[CHT] Standings built: ${rows.length} teams | sample: ${rows[0]?.teamName} ${rows[0]?.conf} ${rows[0]?.ovr}`);

    return rows;
  }

  // ── SeasonEngine.getStandings ─────────────────────────────────────────────────
  // @deprecated — Use getConferenceStandings(gameIndex) instead.

  function getStandings() {
    const season = getActive();
    if (!season) return { conference: [], overall: [] };

    const teamMap = {}; // teamId → accumulator

    function ensureRow(teamId, teamName) {
      if (!teamMap[teamId]) {
        teamMap[teamId] = {
          teamId, teamName,
          gp: 0, wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0,
          confGp: 0, confWins: 0, confLosses: 0, confPtsFor: 0, confPtsAgainst: 0,
        };
      }
      return teamMap[teamId];
    }

    for (const slot of season.schedule) {
      if (!slot.result) continue;
      const { homeScore, awayScore, winnerId } = slot.result;
      const isConf = slot.conference === 'conference';

      const home = ensureRow(slot.homeTeamId, slot.homeName);
      const away = ensureRow(slot.awayTeamId, slot.awayName);

      const homeWon = winnerId === slot.homeTeamId || winnerId === slot.homeName;

      home.gp++;       home.ptsFor += homeScore;  home.ptsAgainst += awayScore;
      away.gp++;       away.ptsFor += awayScore;  away.ptsAgainst += homeScore;
      if (homeWon) { home.wins++; away.losses++; }
      else         { away.wins++; home.losses++; }

      if (isConf) {
        home.confGp++;  home.confPtsFor += homeScore;  home.confPtsAgainst += awayScore;
        away.confGp++;  away.confPtsFor += awayScore;  away.confPtsAgainst += homeScore;
        if (homeWon) { home.confWins++; away.confLosses++; }
        else         { away.confWins++; home.confLosses++; }
      }
    }

    function buildRow(r, useConf) {
      const gp  = useConf ? r.confGp           : r.gp;
      const w   = useConf ? r.confWins          : r.wins;
      const l   = useConf ? r.confLosses        : r.losses;
      const pf  = useConf ? r.confPtsFor        : r.ptsFor;
      const pa  = useConf ? r.confPtsAgainst    : r.ptsAgainst;
      return {
        teamId:      r.teamId,
        teamName:    r.teamName,
        gp,
        wins:        w,
        losses:      l,
        ptsFor:      pf,
        ptsAgainst:  pa,
        diff:        gp > 0 ? (pf - pa) / gp : 0,
        winPct:      gp > 0 ? w / gp : 0,
      };
    }

    function sortRows(rows) {
      return rows.slice().sort((a, b) => (b.wins - a.wins) || (b.winPct - a.winPct));
    }

    const all = Object.values(teamMap);
    return {
      conference: sortRows(all.filter(r => r.confGp > 0).map(r => buildRow(r, true))),
      overall:    sortRows(all.map(r => buildRow(r, false))),
    };
  }

  // ── SeasonEngine.getUserRecord ────────────────────────────────────────────────

  function getUserRecord() {
    const season = getActive();
    if (season) {
      const userGames = season.schedule?.filter(g => g.isUserGame) || [];
      console.log('[getUserRecord] userGames count:', userGames.length,
        'with results:', userGames.filter(g => g.result).length,
        'losses:', userGames.filter(g => g.result && g.result.winnerId !== season.userTeamId).length);
    }
    if (!season) return { overall: { w: 0, l: 0 }, conference: { w: 0, l: 0 }, streak: '' };

    const uid = season.userTeamId;
    let overallW = 0, overallL = 0, confW = 0, confL = 0;
    const results = []; // chronological W/L for streak

    for (const slot of season.schedule) {
      if (!slot.isUserGame) continue;
      if (!slot.result) continue;
      const won = slot.result.winnerId === uid;
      results.push(won ? 'W' : 'L');
      if (won) overallW++; else overallL++;
      if (slot.conference === 'conference') {
        if (won) confW++; else confL++;
      }
    }

    let streak = '';
    if (results.length > 0) {
      const last = results[results.length - 1];
      let n = 0;
      for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
      streak = last + n;
    }

    return {
      overall:    { w: overallW, l: overallL },
      conference: { w: confW,    l: confL    },
      streak,
    };
  }

  // ── SeasonEngine.complete ─────────────────────────────────────────────────────

  function complete(season) {
    if (!season) season = getActive();
    if (!season) return;

    // Simulate remaining conf games and persist final standings before clearing
    // the active session so the complete-season view and stats.html have data.
    const finalStandings = getConferenceStandings(31);
    Store.set('season:' + season.seasonId + ':final_standings', finalStandings);

    // Re-read from localStorage: simulateToIndex() inside getConferenceStandings()
    // wrote the fully-resolved schedule to 'season:active'. The in-memory `season`
    // reference predates that write, so spread the fresh copy instead.
    const freshSeason = Store.get('season:active') || season;
    freshSeason.status = 'complete';
    Store.set('season:' + freshSeason.seasonId + ':meta', freshSeason);
    _lastCompleted = { ...freshSeason };
    Store.del('season:active');

    if (typeof BoxScore !== 'undefined') {
      BoxScore.purgeDetail(freshSeason.seasonId);
    }

    // Compute final record directly from freshSeason (active is already removed)
    const uid = freshSeason.userTeamId;
    let w = 0, l = 0;
    for (const slot of freshSeason.schedule) {
      if (!slot.isUserGame) continue;
      if (slot.result && slot.result.winnerId === uid) w++; else if (slot.result) l++;
    }
    console.log(`[CHT] Season complete — ${freshSeason.userTeamName} finished ${w}-${l}`);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    create,
    _buildUnifiedSchedule,
    getActive,
    getSchedule,
    getNextGame,
    recordResult,
    simulateToIndex,
    getConferenceStandings,
    getStandings,
    getUserRecord,
    complete,
    getConferenceTournamentBids,
    getLastCompleted: () => {
      if (_lastCompleted) return _lastCompleted;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('season:') && key.endsWith(':meta')) {
            const data = Store.get(key);
            if (data && data.status === 'complete') {
              _lastCompleted = data;
              return _lastCompleted;
            }
          }
        }
      } catch(e) {
        console.warn('[SeasonEngine] getLastCompleted scan failed:', e);
      }
      return null;
    },
  };

})();
