// HOW TO USE: In browser DevTools console, type:
//   const s = document.createElement('script'); s.src='debug.js'; document.head.appendChild(s);
// Then call CHT_Debug.dataHealth(), CHT_Debug.teamReport('Arizona'), etc.
//
// NOT imported by the app — manual console use only.

window.CHT_Debug = (() => {

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getTeams() {
    return window.TEAMS || [];
  }

  function getConferences() {
    return window.CONFERENCES || [];
  }

  function isEligible(p) {
    return (p.minutes_per_game || 0) > 0 && p.fga_per_100 != null;
  }

  function findTeam(idOrName) {
    const key = (idOrName || '').toLowerCase();
    return getTeams().find(
      t => t.id.toLowerCase() === key || t.name.toLowerCase() === key
    );
  }

  // ── CHT_Debug.teamReport(teamIdOrName) ───────────────────────────────────

  function teamReport(teamIdOrName) {
    const team = findTeam(teamIdOrName);
    if (!team) {
      console.warn(`[CHT_Debug] No team found matching "${teamIdOrName}"`);
      return;
    }

    const players    = team.players || [];
    const eligible   = players.filter(isEligible);
    const ineligible = players.filter(p => !isEligible(p));

    console.group(`%c${team.name}`, 'font-weight:bold;font-size:1.1em');
    console.log('Conference :', team.conference);
    console.log('Type       :', team.type);
    console.log('Net Rating :', team.net_rating !== undefined ? team.net_rating : '(not set)');
    console.log('Coach      :', team.head_coach || '—');
    console.log('City       :', team.city       || '—');
    console.log(`Players    : ${players.length} total  |  ${eligible.length} eligible  |  ${ineligible.length} ineligible`);

    if (eligible.length > 0) {
      console.group('Eligible players (mpg > 0, fga_per_100 not null)');
      console.table(
        eligible
          .slice()
          .sort((a, b) => (b.minutes_per_game || 0) - (a.minutes_per_game || 0))
          .map(p => ({
            name    : p.name,
            pos     : p.position,
            class   : p.class,
            mpg     : p.minutes_per_game,
            ppg     : p.ppg,
            fga100  : p.fga_per_100,
          }))
      );
      console.groupEnd();
    }

    if (ineligible.length > 0) {
      console.group(`Ineligible players (${ineligible.length})`);
      console.log(ineligible.map(p => p.name).join(', '));
      console.groupEnd();
    }

    console.groupEnd();
  }

  // ── CHT_Debug.conferenceReport(conferenceName) ───────────────────────────

  function conferenceReport(conferenceName) {
    const key  = (conferenceName || '').toLowerCase();
    const conf = getConferences().find(c => c.name.toLowerCase() === key || c.id.toLowerCase() === key);

    if (!conf) {
      console.warn(`[CHT_Debug] No conference found matching "${conferenceName}"`);
      console.log('Known conferences:', getConferences().map(c => c.name).join(', '));
      return;
    }

    const teams = getTeams().filter(t => t.conference === conf.name);

    console.group(`%c${conf.name}  (${teams.length} teams)`, 'font-weight:bold;font-size:1.1em');

    const rows = teams
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(t => {
        const eligible = (t.players || []).filter(isEligible).length;
        return {
          team      : t.name,
          net_rating : t.net_rating,
          eligible  : eligible,
          warning   : eligible < 7 ? '⚠ WARNING' : '',
        };
      });

    console.table(rows);

    const warned = rows.filter(r => r.warning);
    if (warned.length > 0) {
      console.warn(`${warned.length} team(s) with fewer than 7 eligible players: ${warned.map(r => r.team).join(', ')}`);
    }

    console.groupEnd();
  }

  // ── CHT_Debug.dataHealth() ───────────────────────────────────────────────

  function dataHealth() {
    console.group('%cCHT_Debug.dataHealth()', 'font-weight:bold;font-size:1.1em');

    const teams       = getTeams();
    const conferences = getConferences();

    // window globals
    if (teams.length > 0) {
      console.log(`%c  PASS  window.TEAMS loaded — ${teams.length} teams`, 'color:green');
    } else {
      console.error('  FAIL  window.TEAMS is empty or not defined');
    }

    if (conferences.length > 0) {
      console.log(`%c  PASS  window.CONFERENCES loaded — ${conferences.length} conferences`, 'color:green');
    } else {
      console.error('  FAIL  window.CONFERENCES is empty or not defined');
    }

    // Total eligible players
    let totalEligible = 0;
    const thinTeams   = [];

    for (const t of teams) {
      const eligible = (t.players || []).filter(isEligible).length;
      totalEligible += eligible;
      if (eligible < 7) thinTeams.push({ name: t.name, conference: t.conference, eligible });
    }

    console.log(`  Total eligible players : ${totalEligible}`);
    console.log(`  Total teams            : ${teams.length}`);

    if (thinTeams.length === 0) {
      console.log('%c  PASS  All teams have 7+ eligible players', 'color:green');
    } else {
      console.warn(`  WARN  ${thinTeams.length} team(s) with fewer than 7 eligible players:`);
      console.table(thinTeams);
    }

    // Conference integrity
    const teamIds    = new Set(teams.map(t => t.id));
    const confNames  = new Set(conferences.map(c => c.name));
    let brokenRefs   = 0;
    let orphanTeams  = 0;

    for (const conf of conferences) {
      for (const mid of conf.memberIds || []) {
        if (!teamIds.has(mid)) {
          console.error(`  FAIL  Conference "${conf.name}" memberID "${mid}" has no matching team`);
          brokenRefs++;
        }
      }
    }

    for (const t of teams) {
      if (!confNames.has(t.conference)) {
        console.error(`  FAIL  Team "${t.name}" references unknown conference "${t.conference}"`);
        orphanTeams++;
      }
    }

    if (brokenRefs === 0 && orphanTeams === 0) {
      console.log('%c  PASS  Conference integrity OK', 'color:green');
    }

    console.groupEnd();
  }

  // ── CHT_Debug.lastGame() ─────────────────────────────────────────────────

  function lastGame() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('game:'))
      .sort();

    if (keys.length === 0) {
      console.log('[CHT_Debug] No games recorded yet');
      return;
    }

    const lastKey = keys[keys.length - 1];
    let game;
    try {
      game = JSON.parse(localStorage.getItem(lastKey));
    } catch {
      console.error(`[CHT_Debug] Could not parse stored game at key "${lastKey}"`);
      return;
    }

    // Box score structure: game.home / game.away each have { teamName, score, players[] }
    const awayName  = game.away ? game.away.teamName : '?';
    const homeName  = game.home ? game.home.teamName : '?';
    const awayScore = game.away ? game.away.score    : '?';
    const homeScore = game.home ? game.home.score    : '?';

    console.group(`%cLast Game  [${lastKey}]`, 'font-weight:bold;font-size:1.1em');
    console.log(`${awayName}  ${awayScore}  —  ${homeScore}  ${homeName}`);
    console.log(`context: ${game.context || '—'}  |  pbp events: ${game.pbp ? game.pbp.length : 'null'}  |  strategyLog: ${game.strategyLog ? game.strategyLog.length + ' entries' : 'null'}`);

    for (const side of ['away', 'home']) {
      const sideData = game[side];
      const teamName = sideData ? sideData.teamName : side;

      console.group(`Top scorers — ${teamName}`);
      if (!sideData || !Array.isArray(sideData.players) || sideData.players.length === 0) {
        console.log('(no player stats recorded)');
      } else {
        const top3 = sideData.players
          .slice()
          .sort((a, b) => (b.pts || 0) - (a.pts || 0))
          .slice(0, 3);
        console.table(
          top3.map(p => ({
            name : p.name,
            pts  : p.pts || 0,
            reb  : p.reb || 0,
            ast  : p.ast || 0,
          }))
        );
      }
      console.groupEnd();
    }

    console.groupEnd();
  }

  // ── CHT_Debug.gameHistory() ───────────────────────────────────────────────
  // Lists all stored game records grouped by season, newest first.

  function gameHistory() {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith('game:'))
      .sort()
      .reverse(); // newest gameId (timestamp) first

    if (keys.length === 0) {
      console.log('[CHT_Debug] No games recorded yet');
      return;
    }

    // Group by seasonId (key format: game:{seasonId}:{gameId})
    const bySeasonOrdered = [];
    const seasonMap = {};
    for (const key of keys) {
      const parts   = key.split(':');
      const season  = parts[1] || 'unknown';
      if (!seasonMap[season]) {
        seasonMap[season] = [];
        bySeasonOrdered.push(season);
      }
      let game;
      try { game = JSON.parse(localStorage.getItem(key)); } catch { game = null; }
      if (game) seasonMap[season].push({ key, game });
    }

    console.group(`%cCHT_Debug.gameHistory()  (${keys.length} game${keys.length !== 1 ? 's' : ''} total)`, 'font-weight:bold;font-size:1.1em');

    for (const season of bySeasonOrdered) {
      const entries = seasonMap[season];
      console.group(`Season: ${season}  (${entries.length} game${entries.length !== 1 ? 's' : ''})`);
      console.table(
        entries.map(({ key, game }) => ({
          key,
          date:    game.date    || '—',
          away:    game.away    ? `${game.away.teamName} ${game.away.score}`   : '—',
          home:    game.home    ? `${game.home.teamName} ${game.home.score}`   : '—',
          winner:  game.winner  || 'tie',
          context: game.context || '—',
          pbp:     game.pbp     ? `${game.pbp.length} events` : 'null',
          stratLog: game.strategyLog ? `${game.strategyLog.length} entries` : 'null',
        }))
      );
      console.groupEnd();
    }

    console.groupEnd();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  console.log('[CHT_Debug] loaded — available methods: teamReport, conferenceReport, dataHealth, lastGame, gameHistory');

  return { teamReport, conferenceReport, dataHealth, lastGame, gameHistory };

})();
