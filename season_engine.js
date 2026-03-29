// season_engine.js
// Defines window.SeasonEngine — season creation, scheduling, and state management.
// Depends on window.Store and window.TEAMS. Loaded after stats_engine.js in index.html.

window.SeasonEngine = (() => {

  // ── Game dates (ordinal lookup table) ────────────────────────────────────────
  // Indices  0-11: non-conference games (Nov 20 – Dec 21)
  // Indices 12-29: conference games     (Jan 2  – Mar 5)

  const GAME_DATES = [
    'Nov 20', 'Nov 23', 'Nov 26', 'Nov 29',
    'Dec 2',  'Dec 5',  'Dec 8',  'Dec 11',
    'Dec 14', 'Dec 17', 'Dec 20', 'Dec 21',
    'Jan 2',  'Jan 6',  'Jan 9',  'Jan 13',
    'Jan 17', 'Jan 20', 'Jan 24', 'Jan 27',
    'Jan 31', 'Feb 3',  'Feb 7',  'Feb 10',
    'Feb 14', 'Feb 17', 'Feb 21', 'Feb 24',
    'Feb 28', 'Mar 5',
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────────

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
  // Odd-sized conferences get a virtual BYE team; BYE matchups are discarded.

  function _buildConferenceSchedule(conferenceTeams) {
    let teams = conferenceTeams.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (teams.length % 2 !== 0) {
      teams = [...teams, { id: 'BYE', name: 'BYE' }];
    }
    const N = teams.length; // even

    // ── Standard round-robin: fix teams[0], rotate teams[1..N-1] ─────────────
    // N-1 rounds; each round produces N/2 pairs (one may be a BYE, which is skipped).
    const rotating      = teams.slice(1);
    const firstMeetings = []; // { home, away, round }

    for (let r = 0; r < N - 1; r++) {
      const arrangement = [teams[0]];
      for (let i = 0; i < N - 1; i++) {
        arrangement.push(rotating[(i + r) % (N - 1)]);
      }

      for (let i = 0; i < N / 2; i++) {
        const teamA = arrangement[i];
        const teamB = arrangement[N - 1 - i];
        if (teamA.id === 'BYE' || teamB.id === 'BYE') continue;

        // Balance home/away by round + pair-index parity
        const homeTeam = (r + i) % 2 === 0 ? teamA : teamB;
        const awayTeam = (r + i) % 2 === 0 ? teamB : teamA;
        firstMeetings.push({
          home: { id: _normalizeId(homeTeam.id), name: homeTeam.name },
          away: { id: _normalizeId(awayTeam.id), name: awayTeam.name },
          round: r,
        });
      }
    }

    // ── Rematches: bring every real team to exactly 18 conf games ─────────────
    const firstMeetingCount = {};
    for (const g of firstMeetings) {
      firstMeetingCount[g.home.id] = (firstMeetingCount[g.home.id] || 0) + 1;
      firstMeetingCount[g.away.id] = (firstMeetingCount[g.away.id] || 0) + 1;
    }

    const rematchCount = {};
    for (const t of conferenceTeams) {
      rematchCount[t.id] = Math.max(0, 18 - (firstMeetingCount[t.id] || 0));
    }

    const rematches = [];
    for (const g of shuffle(firstMeetings)) {
      if (rematchCount[g.home.id] > 0 && rematchCount[g.away.id] > 0) {
        rematches.push({ home: g.away, away: g.home }); // flip home/away
        rematchCount[g.home.id]--;
        rematchCount[g.away.id]--;
      }
    }

    // ── Assign ordinal GAME_DATES indices and build output ────────────────────
    const numFirstRounds = N - 1;
    const allGames = [];

    for (const g of firstMeetings) {
      allGames.push({ home: g.home, away: g.away, roundIndex: 12 + g.round });
    }
    rematches.forEach((g, i) => {
      allGames.push({
        home: g.home, away: g.away,
        roundIndex: Math.min(12 + numFirstRounds + i, 29),
      });
    });

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

  function _buildAllNonConfSchedules(conferenceTeams, userTeamId) {
    const confIds = new Set(conferenceTeams.map(t => t.id));
    const ncPool  = getTeams().filter(t => !confIds.has(t.id));
    const allGames = [];

    for (const team of conferenceTeams) {
      if (team.id === userTeamId) continue; // user's schedule handled separately

      // Pick 12 non-conf opponents: 6 from P5 conferences (3H/3A) + 6 from Independents (3H/3A)
      function pickFromPool(pool, n) {
        if (pool.length === 0) return [];
        let picked = shuffle(pool.slice());
        while (picked.length < n) picked = [...picked, ...shuffle(pool.slice())];
        return picked.slice(0, n);
      }

      const p5Pool  = ncPool.filter(t => t.type !== 'independent');
      const indPool = ncPool.filter(t => t.type === 'independent');
      let p5Picked  = pickFromPool(p5Pool, 6);
      let indPicked = pickFromPool(indPool, 6);
      if (p5Picked.length === 0)  p5Picked  = pickFromPool(indPool, 6);
      if (indPicked.length === 0) indPicked = pickFromPool(p5Pool,  6);

      const ncHome = [...p5Picked.slice(0, 3), ...indPicked.slice(0, 3)];
      const ncAway = [...p5Picked.slice(3),    ...indPicked.slice(3)];
      const tid    = _normalizeId(team.id);

      ncHome.forEach((opp, idx) => {
        allGames.push({
          gameId:     'ng_' + tid + '_' + idx,
          date:       GAME_DATES[idx],
          gameIndex:  idx,
          homeTeamId: tid,
          homeName:   team.name,
          awayTeamId: _normalizeId(opp.id),
          awayName:   opp.name,
          teamId:     tid,
          status:     'pending',
          result:     null,
        });
      });

      ncAway.forEach((opp, idx) => {
        allGames.push({
          gameId:     'ng_' + tid + '_' + (idx + 6),
          date:       GAME_DATES[idx + 6],
          gameIndex:  idx + 6,
          homeTeamId: _normalizeId(opp.id),
          homeName:   opp.name,
          awayTeamId: tid,
          awayName:   team.name,
          teamId:     tid,
          status:     'pending',
          result:     null,
        });
      });
    }

    return allGames;
  }

  // ── SeasonEngine._buildSchedule ───────────────────────────────────────────────
  //
  // Derives the user's personal 30-game schedule. Conference games come from
  // the master confSchedule (filtered to user's team, sorted by roundIndex),
  // then force-balanced to 9H/9A and interleaved H-A-H-A. Non-conf games are
  // sequenced with no more than 2 consecutive home or away.
  //
  // All dates are set by ordinal lookup: slot at gameIndex i → GAME_DATES[i].

  function _buildSchedule(userTeam, confSchedule) {

    // ── Conference games: pull from master schedule, sort by roundIndex ───────

    const userConfSlots = (confSchedule || [])
      .filter(g => g.homeTeamId === userTeam.id || g.awayTeamId === userTeam.id)
      .sort((a, b) => a.roundIndex - b.roundIndex);

    // Keep games in master round order so user opponents stay in sync with the
    // master conf schedule. H/A is assigned by position parity (even → home,
    // odd → away) for a balanced alternating pattern without reordering.
    const confGames = userConfSlots.map((g, i) => {
      const masterOpp = g.homeTeamId === userTeam.id
        ? { id: g.awayTeamId, name: g.awayName }
        : { id: g.homeTeamId, name: g.homeName };
      return { opp: masterOpp, userIsHome: (i % 2 === 0) };
    });

    console.log('[CHT] Conf sequence:',
      confGames.map(g => g.userIsHome ? 'H' : 'A').join('-'));

    // ── Non-conference games ──────────────────────────────────────────────────

    const confOppIds = new Set(userConfSlots.map(g =>
      g.homeTeamId === userTeam.id ? g.awayTeamId : g.homeTeamId
    ));
    const ncPool = getTeams().filter(t =>
      t.id !== userTeam.id && !confOppIds.has(t.id)
    );

    // 6 from P5 conferences (3H/3A) + 6 from Independents (3H/3A)
    function pickFromPool(pool, n) {
      if (pool.length === 0) return [];
      let picked = shuffle(pool.slice());
      while (picked.length < n) picked = [...picked, ...shuffle(pool.slice())];
      return picked.slice(0, n);
    }

    const p5Pool  = ncPool.filter(t => t.type !== 'independent');
    const indPool = ncPool.filter(t => t.type === 'independent');
    let p5Picked  = pickFromPool(p5Pool, 6);
    let indPicked = pickFromPool(indPool, 6);
    if (p5Picked.length === 0)  p5Picked  = pickFromPool(indPool, 6);
    if (indPicked.length === 0) indPicked = pickFromPool(p5Pool,  6);

    const ncHome = [...p5Picked.slice(0, 3), ...indPicked.slice(0, 3)];
    const ncAway = [...p5Picked.slice(3),    ...indPicked.slice(3)];

    // ── Sequence non-conf block: no more than 2 consecutive home or away ──────

    function sequenceBlock(homeList, awayList, startHome) {
      const homes  = shuffle(homeList.slice());
      const aways  = shuffle(awayList.slice());
      const result = [];
      let consecHome = 0, consecAway = 0;
      let preferHome = startHome;

      while (homes.length > 0 || aways.length > 0) {
        let useHome;
        if      (homes.length === 0) useHome = false;
        else if (aways.length === 0) useHome = true;
        else if (consecHome >= 2)    useHome = false;
        else if (consecAway >= 2)    useHome = true;
        else                         useHome = preferHome;

        if (useHome) {
          result.push({ opp: homes.shift(), userIsHome: true });
          consecHome++;
          consecAway = 0;
          preferHome = false;
        } else {
          result.push({ opp: aways.shift(), userIsHome: false });
          consecAway++;
          consecHome = 0;
          preferHome = true;
        }
      }
      return result;
    }

    const ncSequenced = sequenceBlock(ncHome, ncAway, true);

    // ── Build final slot list — dates from GAME_DATES[gameIndex] ─────────────

    const slots = [];

    ncSequenced.forEach((g, i) => {
      slots.push({
        gameIndex:  i,
        date:       GAME_DATES[i],
        homeTeamId: g.userIsHome ? userTeam.id   : g.opp.id,
        homeName:   g.userIsHome ? userTeam.name : g.opp.name,
        awayTeamId: g.userIsHome ? g.opp.id      : userTeam.id,
        awayName:   g.userIsHome ? g.opp.name    : userTeam.name,
        conference: 'nonconf',
        status:     'pending',
        result:     null,
      });
    });

    confGames.forEach((g, i) => {
      slots.push({
        gameIndex:  12 + i,
        date:       GAME_DATES[12 + i],
        homeTeamId: g.userIsHome ? userTeam.id   : g.opp.id,
        homeName:   g.userIsHome ? userTeam.name : g.opp.name,
        awayTeamId: g.userIsHome ? g.opp.id      : userTeam.id,
        awayName:   g.userIsHome ? g.opp.name    : userTeam.name,
        conference: 'conference',
        status:     'pending',
        result:     null,
      });
    });

    return slots;
  }

  // ── SeasonEngine.create ───────────────────────────────────────────────────────

  function create(userTeamId) {
    userTeamId = _normalizeId(userTeamId);
    const userTeam = getTeams().find(t => _normalizeId(t.id) === userTeamId);
    if (!userTeam) {
      console.error(`[SeasonEngine] Team not found: "${userTeamId}"`);
      return null;
    }

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

    // ── Build master conference schedule FIRST so dates can be passed to _buildSchedule
    const conferenceTeams  = getTeams().filter(t => t.conference === userTeam.conference);
    const confSchedule     = _buildConferenceSchedule(conferenceTeams);
    const nonConfGames     = _buildAllNonConfSchedules(conferenceTeams, userTeam.id);
    const masterData       = { confSchedule, nonConfGames, lastSimIndex: null };

    season.schedule = _buildSchedule(userTeam, confSchedule);

    Store.set('season:active', season);
    Store.set('season:' + seasonId + ':meta', season);
    Store.set('season:' + seasonId + ':conf_schedule', masterData);

    console.log(
      `[CHT] Season created — ${userTeam.name} | conf games: ${confSchedule.length}` +
      ` | non-user NC games: ${nonConfGames.length}`
    );

    return season;
  }

  // ── SeasonEngine.getActive ────────────────────────────────────────────────────

  function getActive() {
    const season = Store.get('season:active') || null;
    if (!season) return null;

    // One-time migration: underscore ids → hyphen ids
    if (!season._idsMigrated) {
      season.userTeamId = _toHyphen(season.userTeamId);
      for (const slot of (season.schedule || [])) {
        slot.homeTeamId = _toHyphen(slot.homeTeamId);
        slot.awayTeamId = _toHyphen(slot.awayTeamId);
      }
      const confKey = 'season:' + season.seasonId + ':conf_schedule';
      const masterData = Store.get(confKey);
      if (masterData) {
        for (const g of (masterData.confSchedule || [])) {
          g.homeTeamId = _toHyphen(g.homeTeamId);
          g.awayTeamId = _toHyphen(g.awayTeamId);
        }
        for (const g of (masterData.nonConfGames || [])) {
          g.homeTeamId = _toHyphen(g.homeTeamId);
          g.awayTeamId = _toHyphen(g.awayTeamId);
          if (g.teamId) g.teamId = _toHyphen(g.teamId);
        }
        Store.set(confKey, masterData);
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
    return getSchedule().find(g => g.status === 'pending') || null;
  }

  // ── SeasonEngine.recordResult ─────────────────────────────────────────────────

  function recordResult(gameIndex, result) {
    const season = getActive();
    if (!season) { console.error('[SeasonEngine] No active season'); return; }

    const slot = season.schedule[gameIndex];
    slot.status = result.method;
    slot.result = result;
    season.currentGame++;

    // Sync conf game results to master schedule so standings are accurate.
    // Without this, the interleaved personal schedule and the round-ordered
    // master schedule would disagree on which teams have played.
    if (slot.conference === 'conference') {
      const masterData = getConfSchedule();
      if (masterData) {
        const uid   = season.userTeamId;
        const oppId = slot.homeTeamId === uid ? slot.awayTeamId : slot.homeTeamId;
        const masterGame = masterData.confSchedule.find(g =>
          (g.homeTeamId === uid || g.awayTeamId === uid) &&
          (g.homeTeamId === oppId || g.awayTeamId === oppId)
        );
        if (masterGame && !masterGame.result) {
          // Translate score to master home/away orientation
          const flip = masterGame.homeTeamId !== slot.homeTeamId;
          masterGame.result = {
            homeScore: flip ? result.awayScore : result.homeScore,
            awayScore: flip ? result.homeScore : result.awayScore,
            winnerId:  result.winnerId,
            method:    result.method,
          };
          masterGame.status = result.method;
          Store.set('season:' + season.seasonId + ':conf_schedule', masterData);
        }
      }
    }

    if (season.currentGame >= 30) {
      complete(season);
    } else {
      Store.set('season:active', season);
      Store.set('season:' + season.seasonId + ':meta', season);
    }
  }

  // ── SeasonEngine.getConfSchedule ──────────────────────────────────────────────

  function getConfSchedule() {
    const season = getActive();
    if (!season) return null;
    return Store.get('season:' + season.seasonId + ':conf_schedule') || null;
  }

  // ── SeasonEngine.simulateToIndex ──────────────────────────────────────────────
  //
  // Simulates games for every non-user conference team so that each team has
  // resolved exactly gameIndex game slots — matching the user's total games played.
  //
  // Per-team sequence (12 nonConf + 18 conf = 30 games total):
  //   [0-11]  non-conf games, sorted by gameIndex
  //   [12-29] ALL conf games including user matchups, sorted by roundIndex
  //
  // slice(0, gameIndex) gives every team exactly gameIndex slots. User games
  // inside the slice are already resolved via recordResult and are skipped by
  // the pending+non-user filter, keeping confGP balanced across all teams.
  //
  // No-op when window.CpuSim is unavailable (e.g. stats.html read-only context).

  function simulateToIndex(gameIndex) {
    if (typeof window.CpuSim === 'undefined') return;

    const season = getActive();
    if (!season) return;

    const masterData = getConfSchedule();
    if (!masterData) return;

    const uid = season.userTeamId;
    let simCount = 0;
    const simulatedThisRun = new Set();

    // Collect all non-user conference team IDs
    const confTeamIds = new Set();
    for (const g of masterData.confSchedule) {
      if (g.homeTeamId !== uid) confTeamIds.add(g.homeTeamId);
      if (g.awayTeamId !== uid) confTeamIds.add(g.awayTeamId);
    }

    for (const teamId of confTeamIds) {
      // Non-conf games for this team (gameIndex 0-11), sorted
      const nonConf = masterData.nonConfGames
        .filter(g => g.teamId === teamId)
        .sort((a, b) => a.gameIndex - b.gameIndex);

      // ALL conf games for this team (including user matchups), sorted by roundIndex
      // Combined = 12 nonConf + 18 conf = 30 per team (mirrors user's 30-game schedule)
      const conf = masterData.confSchedule
        .filter(g => g.homeTeamId === teamId || g.awayTeamId === teamId)
        .sort((a, b) => a.roundIndex - b.roundIndex);

      const combined = [...nonConf, ...conf];

      // Count pending user games that fall within the first gameIndex slots.
      // These can't be simulated but occupy slice positions — extend the slice
      // to compensate so every team ends up with the same number of non-user
      // conf games resolved (fixes confGP:1 for teams whose earliest conf
      // game is a pending user matchup).
      let pendingUserSlots = 0;
      for (let i = 0; i < Math.min(gameIndex, combined.length); i++) {
        const g = combined[i];
        if (g.status === 'pending' &&
            (g.homeTeamId === uid || g.awayTeamId === uid)) {
          pendingUserSlots++;
        }
      }
      const sliceEnd = Math.min(gameIndex + pendingUserSlots, combined.length);

      const toSimulate = combined
        .slice(0, sliceEnd)
        .filter(g => g.status === 'pending' &&
                     g.homeTeamId !== uid && g.awayTeamId !== uid);

      for (const game of toSimulate) {
        const homeTeam = getTeams().find(t => t.id === game.homeTeamId);
        const awayTeam = getTeams().find(t => t.id === game.awayTeamId);
        if (!homeTeam || !awayTeam) continue;

        if (simulatedThisRun.has(game.gameId)) continue;
        simulatedThisRun.add(game.gameId);
        const result = CpuSim.simulateGame(homeTeam, awayTeam, { isUserTeamInvolved: false, saveForStats: true, seasonId: season.seasonId });
        game.status = 'simulated';
        game.result = {
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          winnerId:  result.winnerId,
          method:    'simulated',
        };
        simCount++;
      }
    }

    masterData.lastSimIndex = gameIndex;
    Store.set('season:' + season.seasonId + ':conf_schedule', masterData);
    console.log('[CHT] simulateToIndex(' + gameIndex + '): simulated ' + simCount + ' games across ' + confTeamIds.size + ' teams');
  }

  // ── SeasonEngine.getConferenceStandings ───────────────────────────────────────
  //
  // Calls simulateToIndex(gameIndex) then builds full conference standings
  // combining master conf schedule (non-user games) with the user's personal
  // schedule (user's games).
  //
  // Returns array sorted by confWins DESC, confWinPct DESC, diff DESC:
  //   { teamId, teamName, gp, wins, losses, confWins, confLosses,
  //     confWinPct, diff, winPct, ovr, conf }

  function getConferenceStandings(gameIndex) {
    simulateToIndex(gameIndex);

    const season = getActive();
    if (!season) return [];

    const masterData = getConfSchedule();
    if (!masterData) return [];

    // Determine which teamIds are in the conference via confSchedule
    const confTeamIds = new Set();
    for (const g of masterData.confSchedule) {
      confTeamIds.add(g.homeTeamId);
      confTeamIds.add(g.awayTeamId);
    }

    const teamMap = {};

    function ensureRow(teamId, teamName) {
      if (!teamMap[teamId]) {
        teamMap[teamId] = {
          teamId, teamName,
          gp: 0, wins: 0, losses: 0,
          confGp: 0, confWins: 0, confLosses: 0,
          ptsFor: 0, ptsAgainst: 0,
        };
      }
      return teamMap[teamId];
    }

    function recordGame(homeId, homeName, awayId, awayName,
                        homeScore, awayScore, winnerId, isConf) {
      const home = ensureRow(homeId, homeName);
      const away = ensureRow(awayId, awayName);
      // Normalize winnerId: match by id OR by name
      const homeWon = winnerId === homeId || winnerId === homeName;

      home.gp++; home.ptsFor += homeScore; home.ptsAgainst += awayScore;
      away.gp++; away.ptsFor += awayScore; away.ptsAgainst += homeScore;
      if (homeWon) { home.wins++; away.losses++; }
      else         { away.wins++; home.losses++; }

      if (isConf) {
        home.confGp++; away.confGp++;
        if (homeWon) { home.confWins++; away.confLosses++; }
        else         { away.confWins++; home.confLosses++; }
      }
    }

    // 1. All completed conference games from master schedule (includes user games
    //    synced via recordResult; redundant index filter removed — simulateToIndex
    //    controls what has been simulated, so result presence is sufficient).
    for (const g of masterData.confSchedule) {
      if (!g.result) continue;
      recordGame(g.homeTeamId, g.homeName, g.awayTeamId, g.awayName,
                 g.result.homeScore, g.result.awayScore, g.result.winnerId, true);
    }

    // 2. Non-conf games for non-user conference teams (overall record only)
    for (const g of masterData.nonConfGames) {
      if (!g.result) continue;
      const isHome       = g.homeTeamId === g.teamId;
      const confTeamName = isHome ? g.homeName : g.awayName;
      const row          = ensureRow(g.teamId, confTeamName);
      const homeWon      = g.result.winnerId === g.homeTeamId ||
                           g.result.winnerId === g.homeName;
      const confTeamWon  = isHome ? homeWon : !homeWon;

      row.gp++;
      row.ptsFor     += isHome ? g.result.homeScore : g.result.awayScore;
      row.ptsAgainst += isHome ? g.result.awayScore : g.result.homeScore;
      if (confTeamWon) row.wins++; else row.losses++;
    }

    // 3. User's non-conf games from personal schedule (user's overall record)
    for (const slot of season.schedule) {
      if (!slot.result || slot.conference !== 'nonconf') continue;
      const isUserHome = slot.homeTeamId === season.userTeamId;
      const row        = ensureRow(season.userTeamId, season.userTeamName);
      const homeWon    = slot.result.winnerId === slot.homeTeamId ||
                         slot.result.winnerId === slot.homeName;
      const userWon    = isUserHome ? homeWon : !homeWon;

      row.gp++;
      row.ptsFor     += isUserHome ? slot.result.homeScore : slot.result.awayScore;
      row.ptsAgainst += isUserHome ? slot.result.awayScore : slot.result.homeScore;
      if (userWon) row.wins++; else row.losses++;
    }

    // Build and sort output — only conference teams
    const standings = Object.values(teamMap)
      .filter(r => confTeamIds.has(r.teamId))
      .map(r => {
        const confWinPct = r.confGp > 0 ? r.confWins / r.confGp : 0;
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

    console.log('[CHT] Standings built:', standings.length, 'teams,',
      'games simulated through index', gameIndex,
      '| sample:', standings[0]?.teamName, standings[0]?.conf, standings[0]?.ovr);

    return standings;
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
    if (!season) return { overall: { w: 0, l: 0 }, conference: { w: 0, l: 0 }, streak: '' };

    const uid = season.userTeamId;
    let overallW = 0, overallL = 0, confW = 0, confL = 0;
    const results = []; // chronological W/L for streak

    for (const slot of season.schedule) {
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
    const finalStandings = getConferenceStandings(30);
    Store.set('season:' + season.seasonId + ':final_standings', finalStandings);

    season.status = 'complete';
    Store.set('season:' + season.seasonId + ':meta', season);
    Store.del('season:active');

    if (typeof BoxScore !== 'undefined') {
      BoxScore.purgeDetail(season.seasonId);
    }

    // Compute final record directly from season (active is already removed)
    const uid = season.userTeamId;
    let w = 0, l = 0;
    for (const slot of season.schedule) {
      if (slot.result && slot.result.winnerId === uid) w++; else if (slot.result) l++;
    }
    console.log(`[CHT] Season complete — ${season.userTeamName} finished ${w}-${l}`);
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  return {
    create,
    _buildSchedule,
    getActive,
    getSchedule,
    getNextGame,
    recordResult,
    getConfSchedule,
    simulateToIndex,
    getConferenceStandings,
    getStandings,
    getUserRecord,
    complete,
  };

})();
