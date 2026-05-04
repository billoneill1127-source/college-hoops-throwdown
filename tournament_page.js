// tournament_page.js
// window.TournamentPage — main controller for the tournament flow.
// Depends on: tournament.js, tournament_bracket.js, cpu_sim.js, boxscore.js
// Must be loaded after all of the above and before the app closes its script block.

window.TournamentPage = (function () {
  'use strict';

  let _containerId = null;
  let _state       = null;

  // ── Utilities ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _injectStyles() {
    if (document.getElementById('tp-styles')) return;
    const s = document.createElement('style');
    s.id = 'tp-styles';
    s.textContent = `
/* ── Entry screen ── */
.tp-entry {
  max-width: 420px; margin: 60px auto; padding: 36px 32px;
  background: var(--card-bg,#fff); border-radius: 14px;
  box-shadow: var(--shadow,0 2px 8px rgba(13,34,64,.1));
  text-align: center;
}
.tp-entry h2 {
  font-size: 1.4rem; font-weight: 900; color: var(--primary,#0d2240);
  margin-bottom: 8px; letter-spacing: -.4px;
}
.tp-entry p { font-size: .85rem; color: var(--text-muted,#6b7a99); margin-bottom: 20px; }
.tp-entry select {
  width: 100%; padding: 10px 12px; border: 1.5px solid var(--border,#dde3ee);
  border-radius: 8px; font-size: .92rem; color: var(--text,#0d2240);
  background: var(--card-bg,#fff); margin-bottom: 14px; cursor: pointer;
}
.tp-entry select:focus { outline: none; border-color: var(--accent,#e8600a); }
.tp-start-btn {
  width: 100%; background: var(--accent,#e8600a); color: #fff; border: none;
  border-radius: 9px; padding: 12px; font-size: .95rem; font-weight: 700;
  cursor: pointer; transition: background .14s;
}
.tp-start-btn:hover { background: #c85008; }

/* ── Sim button on game nodes ── */
.tb-sim-btn {
  display: block; width: calc(100% - 12px); margin: 2px 6px 5px;
  padding: 3px 0; background: var(--primary,#0d2240); color: #e6edf3;
  border: none; border-radius: 5px; font-size: .67rem; font-weight: 700;
  letter-spacing: .4px; cursor: pointer; text-align: center; transition: background .12s;
}
.tb-sim-btn:hover { background: #162f55; }

/* ── Sim-rest button ── */
.tp-sim-rest-btn {
  display: block; width: calc(100% - 32px); max-width: 400px;
  margin: 16px auto 0; padding: 12px 20px;
  background: var(--primary,#0d2240); color: #e6edf3; border: none;
  border-radius: 10px; font-size: .9rem; font-weight: 700; cursor: pointer;
  transition: background .14s; text-align: left;
}
.tp-sim-rest-btn:hover { background: #162f55; }

/* ── Box score screen ── */
.tp-boxscore { padding: 16px; max-width: 900px; margin: 0 auto; }
.tp-bs-header {
  display: flex; align-items: center; justify-content: center; gap: 18px;
  padding: 18px 20px; background: var(--card-bg,#fff);
  border-radius: 12px; box-shadow: var(--shadow,0 2px 8px rgba(13,34,64,.1));
  margin-bottom: 16px;
}
.tp-bs-team { font-size: .82rem; font-weight: 800; text-transform: uppercase; letter-spacing: .8px; }
.tp-bs-score { font-size: 2rem; font-weight: 900; color: var(--primary,#0d2240); letter-spacing: -1px; }
.tp-bs-section { background: var(--card-bg,#fff); border-radius: 10px;
  box-shadow: var(--shadow,0 2px 8px rgba(13,34,64,.1)); margin-bottom: 12px; overflow: hidden; }
.tp-bs-team-hdr {
  font-size: .78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .6px;
  padding: 9px 14px; border-bottom: 1px solid var(--border,#dde3ee);
}
.tp-bs-table { width: 100%; border-collapse: collapse; font-size: .78rem; }
.tp-bs-table th {
  background: #eef2f8; color: var(--text-muted,#6b7a99); font-size: .64rem;
  font-weight: 600; text-transform: uppercase; letter-spacing: .4px;
  padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--border,#dde3ee);
  white-space: nowrap;
}
.tp-bs-table th:first-child { text-align: left; }
.tp-bs-table td { padding: 6px 8px; border-bottom: 1px solid var(--border,#dde3ee); text-align: right; }
.tp-bs-table td:first-child { text-align: left; font-weight: 600; }
.tp-bs-table tr:last-child td { border-bottom: none; }
.tp-bs-table tr:hover td { background: #f5f8ff; }
.tp-bs-totals td { background: #eef2f8; border-top: 2px solid var(--border,#dde3ee); font-size: .76rem; }
.tp-bs-totals td:hover { background: #eef2f8; }
.tp-bs-actions { text-align: center; padding: 8px 0 16px; }
.tp-return-btn {
  background: var(--accent,#e8600a); color: #fff; border: none; border-radius: 9px;
  padding: 11px 32px; font-size: .92rem; font-weight: 700; cursor: pointer; transition: background .14s;
}
.tp-return-btn:hover { background: #c85008; }

/* ── Elimination banner ── */
.tp-elimination-banner {
  background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 9px;
  color: #b91c1c; font-size: .88rem; font-weight: 700; padding: 12px 16px;
  text-align: center; margin-bottom: 14px;
}

/* ── Champion card (full-width below bracket) ── */
.tp-champion-card {
  text-align: center; padding: 36px 20px 28px;
  background: linear-gradient(135deg,#fffbf0,#fff3da);
  border-top: 3px solid #e8b84b; margin-top: 0;
}
.tp-champ-name {
  font-size: 3rem; font-weight: 900; letter-spacing: -1.5px;
  line-height: 1.1; margin-bottom: 6px;
}
.tp-champ-nick { font-size: 1.4rem; font-weight: 600; color: var(--text-muted,#6b7a99); margin-bottom: 10px; }
.tp-champ-label {
  font-size: .82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
  color: #8a6a00; margin-bottom: 24px;
}
.tp-new-tourn-btn {
  background: var(--accent,#e8600a); color: #fff; border: none; border-radius: 9px;
  padding: 12px 32px; font-size: .92rem; font-weight: 700; cursor: pointer; transition: background .14s;
}
.tp-new-tourn-btn:hover { background: #c85008; }

/* ── Page header (matches season.html header style) ── */
.tp-page-header {
  background: var(--primary,#0d2240); color: #fff; padding: 0 20px;
  position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 14px rgba(0,0,0,.35);
  display: flex; align-items: center; gap: 10px; height: 58px;
  flex-wrap: nowrap; overflow: hidden;
}
.tp-page-header-brand { flex-shrink: 0; }
.tp-page-header-logo { font-size: 1.2rem; font-weight: 800; letter-spacing: -.5px; white-space: nowrap; }
.tp-page-header-logo span { color: var(--accent,#e8600a); }
.tp-page-header-sub { font-size: .6rem; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .9px; margin-top: 1px; }
.tp-page-header-info { flex: 1; display: flex; align-items: center; gap: 10px; overflow: hidden; justify-content: flex-end; }
.tp-page-header .hdr-link { color: rgba(255,255,255,.65); font-size: .75rem; font-weight: 700; text-decoration: none; letter-spacing: .4px; }
.tp-page-header .hdr-link:hover { color: #fff; }
`;
    document.head.appendChild(s);
  }

  // ── Container-level event delegation (survives re-renders) ────────────────

  function _bindContainerEvents() {
    const el = document.getElementById(_containerId);
    if (!el || el._tp_bound) return;
    el._tp_bound = true;
    el.addEventListener('click', function (e) {
      const playBtn = e.target.closest('.tb-play-btn');
      if (playBtn && playBtn.dataset.gameId) {
        _state = Tournament.load();
        const game = _state && _state.games.find(g => g.id === playBtn.dataset.gameId);
        if (game) { _playGame(game); return; }
      }
      const simBtn = e.target.closest('.tb-sim-btn');
      if (simBtn && simBtn.dataset.gameId) {
        _state = Tournament.load();
        const game = _state && _state.games.find(g => g.id === simBtn.dataset.gameId);
        if (game) { _simPlayerGame(game); return; }
      }
    });
  }

  // ── Entry screen ───────────────────────────────────────────────────────────

  function _renderEntry() {
    const teams = (window.TEAMS || [])
      .filter(t => t.net_rating != null)
      .sort((a, b) => a.name.localeCompare(b.name));

    const opts = teams.map(t =>
      `<option value="${esc(t.id)}">${esc(t.name)}</option>`
    ).join('');

    document.getElementById(_containerId).innerHTML = `
<div class="tp-entry">
  <h2>2026 NCAA Tournament</h2>
  <p>Select your team to begin</p>
  <select id="tp-team-select">${opts}</select>
  <button class="tp-start-btn" id="tp-start-btn">Start Tournament</button>
</div>`;

    document.getElementById('tp-start-btn').addEventListener('click', start);
  }

  // ── Bracket rendering helpers ──────────────────────────────────────────────

  function _renderBracket() {
    TournamentBracket.render(_containerId);
  }

  // ── Public: init ───────────────────────────────────────────────────────────

  function init(containerId) {
    _injectStyles();

    // Inject header + content wrapper once; re-renders target the inner div
    const contentId = containerId + '-content';
    if (!document.getElementById(contentId)) {
      const outerEl = document.getElementById(containerId);
      const _peek = Tournament.load();
      const _backBtn = (_peek && _peek.fromSeason)
        ? '<a class="back-btn" href="season.html">\u2190 Back to Season</a>'
        : '<button class="back-btn" onclick="showScreen(\'home\')">\u2190 Main Menu</button>';
      outerEl.innerHTML =
        '<div class="tp-page-header">' +
          _backBtn +
          '<div class="tp-page-header-brand">' +
            '<div class="tp-page-header-logo">\uD83C\uDFC0 <span>TOURNAMENT</span> MODE</div>' +
            '<div class="tp-page-header-sub">2025\u201326 &nbsp;\u00B7&nbsp; v3.3</div>' +
          '</div>' +
        '</div>' +
        '<div id="' + contentId + '"></div>';
    }
    _containerId = contentId;
    _bindContainerEvents();

    // Return from a played tournament game
    if (sessionStorage.getItem('tournament_return')) {
      _handlePlayedGameReturn();
      return;
    }

    _state = Tournament.load();
    if (!_state) { _renderEntry(); return; }

    if (_state.status === 'complete') {
      _renderBracket();
      TournamentBracket.setActiveTab('Final Four');
      _showChampion();
      return;
    }

    // Active tournament — resume
    _renderBracket();
    const activeTab = _state.currentRound >= 5 ? 'Final Four' : (_state.userRegion || 'East');
    TournamentBracket.setActiveTab(activeTab);

    // If player still has a pending game in the current round, surface the prompt
    const pendingPlayer = _state.games.find(g =>
      g.round === _state.currentRound && g.isPlayerGame && g.winnerId === null
    );
    const currentRoundGamesResolved = _state.games.filter(
      g => g.round === _state.currentRound && g.winnerId !== null
    ).length;

    if (pendingPlayer && currentRoundGamesResolved === 0) {
      // Fresh round — simulate CPU games first just like start() does
      _runRound();
    } else if (pendingPlayer) {
      // Resuming mid-round — CPU games already done, go straight to P1's prompt
      setTimeout(() => _showPlayPrompt(pendingPlayer), 150);
    } else {
      _runRound();
    }
  }

  // ── Public: start ──────────────────────────────────────────────────────────

  function start() {
    const sel = document.getElementById('tp-team-select');
    if (!sel || !sel.value) return;
    _state = Tournament.generate(sel.value);
    _renderBracket();
    TournamentBracket.setActiveTab(_state.userRegion || 'East');
    _runRound();
  }

  // ── Core round loop ────────────────────────────────────────────────────────

  function _runRound() {
    _state = Tournament.load();
    if (!_state || _state.status !== 'active') {
      console.log('[_runRound] early exit — status:', _state?.status);
      return;
    }

    const round = _state.currentRound;
    const allPending = _state.games.filter(g => g.round === round && g.winnerId === null);
    console.log('[_runRound] round:', round, 'pending:', allPending.length,
      'cpu:', allPending.filter(g => !g.isPlayerGame).length,
      'player:', allPending.filter(g => g.isPlayerGame).length);

    if (!allPending.length) { _advanceRound(); return; }

    const playerGames = allPending.filter(g => g.isPlayerGame);
    const cpuGames    = allPending.filter(g => !g.isPlayerGame);

    // Render bracket BEFORE simming so pending games show as TBD (true reveal animation)
    _renderBracket();
    const activeTab = round >= 5 ? 'Final Four' : (_state.userRegion || 'East');
    TournamentBracket.setActiveTab(activeTab);

    // Sim all CPU games; results stored in localStorage but bracket DOM stays at TBD
    for (const game of cpuGames) {
      const ht = Tournament.getTeam(game.homeTeamId);
      const at = Tournament.getTeam(game.awayTeamId);
      if (!ht || !at) continue;
      const r = CpuSim.simulateGame(ht, at, { neutralSite: true, saveForStats: false });
      Tournament.recordResult(_state, game.id, r.homeScore, r.awayScore);
      _state = Tournament.load();
    }

    // Animate user-region CPU games — scores come from updated state so this IS the reveal
    const animRegion = round >= 5 ? 'Final Four' : (_state.userRegion || 'East');
    const animGames  = _state.games.filter(g =>
      g.round === round && !g.isPlayerGame &&
      (round >= 5 || g.region === animRegion)
    );

    TournamentBracket.animateRoundResults(animRegion, animGames, function () {
      // Re-render so non-user-region tabs now show their results too
      _renderBracket();
      TournamentBracket.setActiveTab(activeTab);
      _state = Tournament.load();

      if (playerGames.length > 0 && !Tournament.isEliminated(_state)) {
        setTimeout(function () {
          const pg = _state.games.find(g =>
            g.round === round && g.isPlayerGame && g.winnerId === null
          );
          if (pg) _showPlayPrompt(pg);
        }, 200);
      } else if (Tournament.isEliminated(_state)) {
        _addSimRestButton();
      } else {
        setTimeout(_advanceRound, 800);
      }
    });
  }

  // ── Round advancement ──────────────────────────────────────────────────────

  function _advanceRound() {
    console.log('[_advanceRound] fired — completed:', _state?.currentRound);
    _state = Tournament.load();
    if (!_state) return;

    const completed = _state.currentRound;
    console.log('[_advanceRound] completed round:', completed, 'fromSeason:', _state?.fromSeason);

    if (completed === 6) { _showChampion(); return; }

    // Generate next round games
    if (completed < 4) {
      for (const region of ['East', 'South', 'Midwest', 'West']) {
        Tournament.generateNextRound(_state, region);
        _state = Tournament.load();
      }
    } else if (completed === 4) {
      Tournament.generateFinalFour(_state);
      _state = Tournament.load();
    } else if (completed === 5) {
      Tournament.generateChampionship(_state);
      _state = Tournament.load();
    }

    _state.currentRound = completed + 1;
    Tournament.save(_state);

    _renderBracket();
    const activeTab = completed >= 4 ? 'Final Four' : (_state.userRegion || 'East');
    TournamentBracket.setActiveTab(activeTab);

    if (Tournament.isEliminated(_state)) {
      _addSimRestButton();
    } else {
      setTimeout(_runRound, 300);
    }
  }

  // ── Play prompt — adds SIM button alongside existing PLAY button ───────────

  function _showPlayPrompt(game) {
    const node = document.querySelector(
      '[data-game-id="' + CSS.escape(game.id) + '"]'
    );
    if (!node || node.querySelector('.tb-sim-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'tb-sim-btn';
    btn.textContent = 'SIM GAME';
    btn.dataset.gameId = game.id;
    node.appendChild(btn);
  }

  // ── Play flow: hand off to live game engine ────────────────────────────────

  function _playGame(game) {
    const homeTeam = Tournament.getTeam(game.homeTeamId);
    const awayTeam = Tournament.getTeam(game.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    sessionStorage.setItem('tournament_return',  'true');
    sessionStorage.setItem('tournament_game_id', game.id);

    // tp_setupGame is a thin shim defined in index.html that sets G.home/visitor
    // and starts the lineup screen — neutral site flag zeroes home_fg_bonus there
    if (typeof tp_setupGame === 'function') {
      tp_setupGame(homeTeam, awayTeam, homeTeam.id === _state.userTeamId);
    }
  }

  // Called by the quitGame / box-score-home hooks in index.html
  function _onGameEnd(homeScore, awayScore) {
    const gameId = sessionStorage.getItem('tournament_game_id');
    sessionStorage.removeItem('tournament_return');
    sessionStorage.removeItem('tournament_game_id');
    sessionStorage.removeItem('tournament_home_score');
    sessionStorage.removeItem('tournament_away_score');
    if (!gameId) return;

    _state = Tournament.load();
    if (!_state) return;

    Tournament.recordResult(_state, gameId, homeScore, awayScore);
    _state = Tournament.load();

    // Return to tournament screen
    if (typeof showScreen === 'function') showScreen('tournament');

    _renderBracket();
    const game    = _state.games.find(g => g.id === gameId);
    const userWon = game && game.winnerId === _state.userTeamId;

    if (!userWon) {
      TournamentBracket.setActiveTab(_state.userRegion || 'East');
      if (game && game.round === 6) { _showChampion(); }
      else                          { _addSimRestButton(); }
    } else {
      TournamentBracket.setActiveTab(_state.userRegion || 'East');
      setTimeout(_advanceRound, 400);
    }
  }

  // Called on init() if tournament_return is in sessionStorage (page-reload fallback)
  function _handlePlayedGameReturn() {
    console.log('[_handlePlayedGameReturn] fired — gameId:',
      sessionStorage.getItem('tournament_game_id'),
      'fromSeason:', _state?.fromSeason);
    const gameId = sessionStorage.getItem('tournament_game_id');
    sessionStorage.removeItem('tournament_return');
    sessionStorage.removeItem('tournament_game_id');
    const hs  = parseInt(sessionStorage.getItem('tournament_home_score') || '0', 10);
    const as_ = parseInt(sessionStorage.getItem('tournament_away_score') || '0', 10);
    sessionStorage.removeItem('tournament_home_score');
    sessionStorage.removeItem('tournament_away_score');

    _state = Tournament.load();
    if (!_state || !gameId) { init(_containerId); return; }

    Tournament.recordResult(_state, gameId, hs, as_);
    _state = Tournament.load();

    _renderBracket();
    const game    = _state.games.find(g => g.id === gameId);
    const userWon = game && game.winnerId === _state.userTeamId;

    TournamentBracket.setActiveTab(_state.userRegion || 'East');
    if (!userWon) {
      if (game && game.round === 6) { _showChampion(); }
      else                          { _addSimRestButton(); }
    } else {
      setTimeout(_advanceRound, 400);
    }
  }

  // ── Sim flow: CPU sims the player game, shows box score ───────────────────

  function _simPlayerGame(game) {
    const homeTeam = Tournament.getTeam(game.homeTeamId);
    const awayTeam = Tournament.getTeam(game.awayTeamId);
    if (!homeTeam || !awayTeam) return;

    const result = CpuSim.simulateGame(homeTeam, awayTeam,
      { neutralSite: true, saveForStats: false });

    Tournament.recordResult(_state, game.id, result.homeScore, result.awayScore);
    _state = Tournament.load();

    const userWon = _state.games.find(g => g.id === game.id)?.winnerId === _state.userTeamId;
    _showSimBoxScore(game, result, homeTeam, awayTeam, !userWon);
  }

  // ── Sim box score display ──────────────────────────────────────────────────

  function _showSimBoxScore(game, result, homeTeam, awayTeam, userLost) {
    const _G = GameEngineSim.G;

    function buildMpgMap(team) {
      const m = {};
      (team.players || []).forEach(p => { m[p.name] = Math.round(p.minutes_per_game || 0); });
      return m;
    }

    function buildTable(team) {
      const mpg   = buildMpgMap(team);
      const names = new Set((team.players || []).map(p => p.name));
      const teamStats = Object.entries(_G.stats || {})
        .filter(([n]) => names.has(n))
        .filter(([, s]) => Math.round((s.secs || 0) / 60) > 0)
        .sort(([, a], [, b]) => (b.pts || 0) - (a.pts || 0));

      const rows = teamStats.map(([name, s]) => `<tr>
  <td>${esc(name)}</td>
  <td>${mpg[name] || 0}</td>
  <td>${s.pts || 0}</td>
  <td>${s.reb || 0}</td>
  <td>${s.ast || 0}</td>
  <td>${s.stl || 0}</td>
  <td>${s.blk || 0}</td>
  <td>${s.tov || 0}</td>
  <td>${s.fgm || 0}/${s.fga || 0}</td>
  <td>${s.tpm || 0}/${s.tpa || 0}</td>
  <td>${s.ftm || 0}/${s.fta || 0}</td>
</tr>`).join('');

      const tot = teamStats.reduce((acc, [, s]) => {
        acc.pts += s.pts || 0; acc.reb += s.reb || 0; acc.ast += s.ast || 0;
        acc.stl += s.stl || 0; acc.blk += s.blk || 0; acc.tov += s.tov || 0;
        acc.fgm += s.fgm || 0; acc.fga += s.fga || 0;
        acc.tpm += s.tpm || 0; acc.tpa += s.tpa || 0;
        acc.ftm += s.ftm || 0; acc.fta += s.fta || 0;
        return acc;
      }, { pts:0, reb:0, ast:0, stl:0, blk:0, tov:0, fgm:0, fga:0, tpm:0, tpa:0, ftm:0, fta:0 });

      const totRow = `<tr class="tp-bs-totals">
  <td><strong>TOTALS</strong></td>
  <td>—</td>
  <td><strong>${tot.pts}</strong></td>
  <td>${tot.reb}</td>
  <td>${tot.ast}</td>
  <td>${tot.stl}</td>
  <td>${tot.blk}</td>
  <td>${tot.tov}</td>
  <td>${tot.fgm}/${tot.fga}</td>
  <td>${tot.tpm}/${tot.tpa}</td>
  <td>${tot.ftm}/${tot.fta}</td>
</tr>`;

      return `<table class="tp-bs-table">
<thead><tr>
  <th>Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th>
  <th>STL</th><th>BLK</th><th>TOV</th><th>FG</th><th>3P</th><th>FT</th>
</tr></thead>
<tbody>${rows}${totRow}</tbody>
</table>`;
    }

    const elimBanner = userLost ? `
<div class="tp-elimination-banner">
  Your tournament is over. ${esc(Tournament.getTeam(_state.userTeamId)?.name || '')} has been eliminated.
</div>` : '';

    const container = document.getElementById(_containerId);
    if (!container) return;
    container.innerHTML = `
<div class="tp-boxscore">
  <div class="tp-bs-header">
    <div class="tp-bs-team" style="color:${esc(awayTeam.primaryColor)}">${esc(awayTeam.name)}</div>
    <div class="tp-bs-score">${result.awayScore} &ndash; ${result.homeScore}</div>
    <div class="tp-bs-team" style="color:${esc(homeTeam.primaryColor)}">${esc(homeTeam.name)}</div>
  </div>
  ${elimBanner}
  <div class="tp-bs-section">
    <div class="tp-bs-team-hdr" style="color:${esc(awayTeam.primaryColor)}">${esc(awayTeam.name)}</div>
    ${buildTable(awayTeam)}
  </div>
  <div class="tp-bs-section">
    <div class="tp-bs-team-hdr" style="color:${esc(homeTeam.primaryColor)}">${esc(homeTeam.name)}</div>
    ${buildTable(homeTeam)}
  </div>
  <div class="tp-bs-actions">
    <button class="tp-return-btn" id="tp-return-btn">Return to Bracket</button>
  </div>
</div>`;

    document.getElementById('tp-return-btn').addEventListener('click', function () {
      _renderBracket();
      if (userLost && game.round === 6) {
        TournamentBracket.setActiveTab('Final Four');
        _showChampion();
      } else if (userLost) {
        TournamentBracket.setActiveTab(_state.userRegion || 'East');
        _addSimRestButton();
      } else {
        TournamentBracket.setActiveTab(_state.userRegion || 'East');
        setTimeout(_advanceRound, 300);
      }
    });
  }

  // ── Elimination helpers ────────────────────────────────────────────────────

  function _addSimRestButton() {
    const container = document.getElementById(_containerId);
    if (!container || container.querySelector('.tp-sim-rest-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'tp-sim-rest-btn';
    btn.innerHTML = '&#9654; Simulate Rest of Tournament';
    btn.addEventListener('click', _simRestOfTournament);
    container.appendChild(btn);

    if (_state && _state.fromSeason && !document.getElementById('btn-season-back-elim')) {
      const backBtn = document.createElement('button');
      backBtn.id = 'btn-season-back-elim';
      backBtn.textContent = '\u2190 Back to Season';
      backBtn.style.cssText = 'display:block;margin:12px auto;padding:8px 18px;background:#1a3a5c;color:white;border:none;border-radius:4px;cursor:pointer;font-size:14px;font-weight:600;';
      backBtn.onclick = () => { window.location.href = 'season.html'; };
      btn.parentNode.insertBefore(backBtn, btn.nextSibling);
    }
  }

  function _simRestOfTournament() {
    _state = Tournament.load();
    if (!_state) return;

    // Keep looping until no games remain to be played.
    // Generate unlockable rounds FIRST each iteration so that games created
    // by a previous sim batch are found by the ready-game check.
    let safety = 0;
    while (safety++ < 20) {
      for (const region of ['East', 'South', 'Midwest', 'West']) {
        Tournament.generateNextRound(_state, region);
        _state = Tournament.load();
      }
      Tournament.generateFinalFour(_state);    _state = Tournament.load();
      Tournament.generateChampionship(_state); _state = Tournament.load();

      const ready = _state.games.filter(g =>
        g.winnerId === null && g.homeTeamId && g.awayTeamId
      );
      if (!ready.length) break;

      for (const game of ready) {
        const ht = Tournament.getTeam(game.homeTeamId);
        const at = Tournament.getTeam(game.awayTeamId);
        if (!ht || !at) continue;
        const r = CpuSim.simulateGame(ht, at, { neutralSite: true, saveForStats: false });
        Tournament.recordResult(_state, game.id, r.homeScore, r.awayScore);
        _state = Tournament.load();
      }
    }

    _renderBracket();
    TournamentBracket.setActiveTab('Final Four');
    _showChampion();
  }

  // ── Champion display ───────────────────────────────────────────────────────

  function _showChampion() {
    _state = Tournament.load();
    if (!_state) return;

    const champGame = _state.games.find(g => g.round === 6 && g.winnerId);
    if (!champGame) return;
    const champion = Tournament.getTeam(champGame.winnerId);
    if (!champion) return;

    // Persist completion
    _state.status   = 'complete';
    _state.champion = champion.id;
    Tournament.save(_state);

    // In-bracket trophy card
    TournamentBracket.showChampion(champion);

    // Full-width card below the bracket
    const container = document.getElementById(_containerId);
    if (!container) return;
    const existing = container.querySelector('.tp-champion-card');
    if (existing) existing.remove();

    const actionBtn = _state.fromSeason
      ? `<button class="tp-back-season-btn" onclick="window.location.href='season.html'">&#8592; Back to Season</button>`
      : `<button class="tp-new-tourn-btn" id="tp-new-tourn-btn">Start New Tournament</button>`;

    const card = document.createElement('div');
    card.className = 'tp-champion-card';
    card.innerHTML =
      `<div class="tp-champ-name" style="color:${esc(champion.primaryColor || '#0d2240')}">${esc(champion.name)}</div>` +
      `<div class="tp-champ-nick">${esc(champion.nickname || '')}</div>` +
      `<div class="tp-champ-label">2026 NCAA Champion</div>` +
      actionBtn;
    container.appendChild(card);

    if (!_state.fromSeason) {
      document.getElementById('tp-new-tourn-btn').addEventListener('click', function () {
        Tournament.clear();
        _state = null;
        _renderEntry();
      });
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  return { init, start, _onGameEnd };

})();
