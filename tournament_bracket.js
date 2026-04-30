// tournament_bracket.js
// window.TournamentBracket — bracket display component.
// Depends on: window.Tournament
// No game logic — display only.
//
// Usage:
//   TournamentBracket.render('myContainerId');
//   TournamentBracket.setActiveTab('East');
//   TournamentBracket.animateRoundResults('East', games, callback);
//   TournamentBracket.showChampion(teamObj);

window.TournamentBracket = (function () {
  'use strict';

  // ── Layout constants ─────────────────────────────────────────────────────
  const SLOT_H    = 90;  // px: height of one R1 game slot (defines all vertical spacing)
  const COL_W     = 210; // px: width of each round column
  const REGION_H  = 8 * SLOT_H; // 720px — total bracket height per region

  // Round labels
  const ROUND_LABELS = { 1: 'First Round', 2: 'Second Round', 3: 'Sweet 16', 4: 'Elite Eight' };

  // Which regions render right-to-left (R1 on the right, regional final on the left)
  const RTL_REGIONS = new Set(['Midwest', 'West']);

  // ── Module state ─────────────────────────────────────────────────────────
  let _state       = null;   // loaded tournament state
  let _container   = null;   // container element id string
  let _activeTab   = 'East'; // currently visible tab

  // ── Utility ──────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function teamName(teamId) {
    const t = Tournament.getTeam(teamId);
    return t ? t.name : (teamId ? String(teamId) : 'TBD');
  }

  function teamColor(teamId) {
    const t = Tournament.getTeam(teamId);
    return (t && t.primaryColor) ? t.primaryColor : '';
  }

  function teamSeed(teamId) {
    if (!_state || !teamId) return '';
    const e = _state.seededField.find(x => x.teamId === teamId);
    return e ? e.seed : '';
  }

  // A player game is "next up" if it hasn't been played and all prior-round
  // games in the region are complete (or this is R1).
  function isNextUp(game) {
    if (!game.isPlayerGame || game.winnerId !== null) return false;
    if (game.round <= 1) return true;
    // Final Four (r5) and Championship (r6) cross region boundaries —
    // their prerequisites span all regions so skip the region filter.
    const crossRegion = game.round >= 5;
    const prev = _state.games.filter(g =>
      g.round === game.round - 1 &&
      (crossRegion || g.region === game.region)
    );
    return prev.length > 0 && prev.every(g => g.winnerId !== null);
  }

  // ── Game node HTML ────────────────────────────────────────────────────────

  function gameNodeHTML(game) {
    if (!game) {
      return `<div class="tb-game tb-game--placeholder">
  <div class="tb-team"><span class="tb-seed"></span><span class="tb-name tb-name--tbd">TBD</span></div>
  <div class="tb-sep"></div>
  <div class="tb-team"><span class="tb-seed"></span><span class="tb-name tb-name--tbd">TBD</span></div>
</div>`;
    }

    const hId = game.homeTeamId, aId = game.awayTeamId;
    const hName  = hId ? teamName(hId)  : 'TBD';
    const aName  = aId ? teamName(aId)  : 'TBD';
    const hSeed  = hId ? teamSeed(hId)  : '';
    const aSeed  = aId ? teamSeed(aId)  : '';
    const hColor = hId ? teamColor(hId) : '';
    const aColor = aId ? teamColor(aId) : '';

    const played  = game.winnerId !== null;
    const hWon    = played && game.winnerId === hId;
    const aWon    = played && game.winnerId === aId;
    const nextUp  = isNextUp(game);
    const statCls = played ? 'complete' : (nextUp ? 'next-up' : 'pending');

    const hScr = played ? String(game.homeScore) : '';
    const aScr = played ? String(game.awayScore) : '';

    const playBtn = nextUp
      ? `<button class="tb-play-btn" data-game-id="${esc(game.id)}">&#9654; PLAY</button>`
      : '';

    return `<div class="tb-game tb-game--${esc(statCls)}" data-game-id="${esc(game.id)}">
  <div class="tb-team${hWon ? ' tb-winner' : played ? ' tb-loser' : ''}">
    <span class="tb-seed">${esc(hSeed)}</span>
    <span class="tb-name" title="${esc(hName)}"${hColor ? ` style="color:${esc(hColor)}"` : ''}>${esc(hName)}</span>
    <span class="tb-score">${esc(hScr)}</span>
  </div>
  <div class="tb-sep"></div>
  <div class="tb-team${aWon ? ' tb-winner' : played ? ' tb-loser' : ''}">
    <span class="tb-seed">${esc(aSeed)}</span>
    <span class="tb-name" title="${esc(aName)}"${aColor ? ` style="color:${esc(aColor)}"` : ''}>${esc(aName)}</span>
    <span class="tb-score">${esc(aScr)}</span>
  </div>${playBtn ? '\n  ' + playBtn : ''}
</div>`;
  }

  // ── Bracket slot layout ───────────────────────────────────────────────────
  //
  // For each round, slots and spacers are interleaved so that every game
  // node's vertical center aligns with the midpoint of the two feeder games
  // from the previous round.
  //
  // SLOT_H = 90px.  Total for all rounds = REGION_H = 720px.
  //
  //   R1: 8 games — no spacers (step=1, top=0, mid=0)
  //   R2: 4 games — top/bottom 45px, between 90px  (step=2)
  //   R3: 2 games — top/bottom 135px, between 270px (step=4)
  //   R4: 1 game  — top/bottom 315px               (step=8)

  function buildLayout(round, games) {
    const step   = Math.pow(2, round - 1);
    const topPad = (step / 2 - 0.5) * SLOT_H; // 0, 45, 135, 315
    const midPad = (step - 1) * SLOT_H;        // 0, 90, 270, 630
    const items  = [];

    for (let i = 0; i < games.length; i++) {
      const pad = i === 0 ? topPad : midPad;
      if (pad > 0) items.push({ type: 'spacer', px: pad });
      items.push({ type: 'game', game: games[i] });
    }
    if (topPad > 0) items.push({ type: 'spacer', px: topPad });
    return items;
  }

  // ── Render one round column ───────────────────────────────────────────────

  function renderRoundCol(round, region) {
    const games = (_state.games || [])
      .filter(g => g.region === region && g.round === round)
      .sort((a, b) => a.id.localeCompare(b.id));

    // Always render the full expected number of slots so later rounds show
    // their placeholder nodes even before they are populated by results.
    const expectedCount = 8 / Math.pow(2, round - 1); // R1=8, R2=4, R3=2, R4=1
    const paddedGames = [...games];
    while (paddedGames.length < expectedCount) paddedGames.push(null);

    const label  = ROUND_LABELS[round] || `Round ${round}`;
    const layout = buildLayout(round, paddedGames);

    let body = '';
    for (const item of layout) {
      if (item.type === 'spacer') {
        body += `<div class="tb-spacer" style="height:${item.px}px"></div>`;
      } else {
        body += `<div class="tb-slot" data-round="${round}">${gameNodeHTML(item.game)}</div>`;
      }
    }

    return `<div class="tb-col" data-round="${round}">
  <div class="tb-col-hdr">${esc(label)}</div>
  <div class="tb-col-body">${body}</div>
</div>`;
  }

  // ── Render connector lines overlay (SVG) ──────────────────────────────────
  // Draws horizontal stubs and vertical bridges between adjacent round columns.
  // Rendered as an absolutely-positioned SVG overlay behind the columns.
  // For LTR: lines exit the right side of each slot and bridge to the next col.
  // For RTL: mirrored.

  function renderConnectors(region, rtl) {
    // Compute vertical center-y of every game in rounds 1–3 and the paired
    // game in the next round, then draw lines.
    const LABEL_H = 28; // approximate height of .tb-col-hdr
    const lines   = [];

    for (let round = 1; round <= 3; round++) {
      const games = (_state.games || [])
        .filter(g => g.region === region && g.round === round)
        .sort((a, b) => a.id.localeCompare(b.id));

      const step    = Math.pow(2, round - 1);
      const topPad  = (step / 2 - 0.5) * SLOT_H;
      const midPad  = (step - 1) * SLOT_H;

      // Y centers for this round's games
      const yCenters = games.map((_, i) => {
        const base = LABEL_H + topPad + SLOT_H / 2;
        return base + i * (SLOT_H + midPad);
      });

      const nextRound    = round + 1;
      const nextStep     = Math.pow(2, nextRound - 1);
      const nextTopPad   = (nextStep / 2 - 0.5) * SLOT_H;
      const nextMidPad   = (nextStep - 1) * SLOT_H;
      const nextYCenters = [];
      const numNext      = Math.ceil(games.length / 2);
      for (let i = 0; i < numNext; i++) {
        const base = LABEL_H + nextTopPad + SLOT_H / 2;
        nextYCenters.push(base + i * (SLOT_H + nextMidPad));
      }

      // Column X positions in a standard LTR layout (Xstart of each col)
      // col 0 = round 1, col 1 = round 2, etc.
      // For RTL the physical col order is reversed: col 0 = round 4
      const srcColIdx  = rtl ? (4 - round)     : (round - 1);
      const destColIdx = rtl ? (4 - nextRound)  : (nextRound - 1);

      const srcX  = rtl
        ? (4 - round) * COL_W + 8          // left stub (RTL: game exits left)
        : round * COL_W - 8;               // right stub (LTR: game exits right)
      const destX = rtl
        ? (4 - nextRound) * COL_W + COL_W - 8
        : nextRound * COL_W - COL_W + 8;

      // For each pair of source games, draw:
      //  1. Two horizontal stubs
      //  2. A vertical bridge
      //  3. A horizontal stub to the dest game midpoint
      for (let j = 0; j < numNext; j++) {
        const y1   = yCenters[j * 2];
        const y2   = yCenters[j * 2 + 1] ?? y1;
        const yMid = nextYCenters[j];

        if (rtl) {
          // Games exit to the left
          const xSrc  = (4 - round) * COL_W;
          const xDest = (4 - nextRound) * COL_W + COL_W;
          const xBridge = xSrc - 8;
          lines.push(
            `<line x1="${xSrc}" y1="${y1}" x2="${xBridge}" y2="${y1}"/>`,
            `<line x1="${xSrc}" y1="${y2}" x2="${xBridge}" y2="${y2}"/>`,
            `<line x1="${xBridge}" y1="${y1}" x2="${xBridge}" y2="${y2}"/>`,
            `<line x1="${xBridge}" y1="${yMid}" x2="${xDest}" y2="${yMid}"/>`
          );
        } else {
          // Games exit to the right
          const xSrc    = round * COL_W;
          const xDest   = nextRound * COL_W - COL_W;
          const xBridge = xSrc + 8;
          lines.push(
            `<line x1="${xSrc}" y1="${y1}" x2="${xBridge}" y2="${y1}"/>`,
            `<line x1="${xSrc}" y1="${y2}" x2="${xBridge}" y2="${y2}"/>`,
            `<line x1="${xBridge}" y1="${y1}" x2="${xBridge}" y2="${y2}"/>`,
            `<line x1="${xBridge}" y1="${yMid}" x2="${xDest}" y2="${yMid}"/>`
          );
        }
      }
    }

    const svgW = COL_W * 4;
    const svgH = REGION_H + 28; // +label height
    return `<svg class="tb-connectors" viewBox="0 0 ${svgW} ${svgH}"
  style="width:${svgW}px;height:${svgH}px;position:absolute;top:0;left:0;pointer-events:none;"
  xmlns="http://www.w3.org/2000/svg">
  <g stroke="var(--border,#dde3ee)" stroke-width="1" fill="none">${lines.join('')}</g>
</svg>`;
  }

  // ── Render a region tab panel ─────────────────────────────────────────────

  function renderRegionPanel(region) {
    const rtl    = RTL_REGIONS.has(region);
    // Always append cols in 1→4 DOM order. For RTL regions, flex-direction:row-reverse
    // visually flips them to 4→1, placing Round 1 on the far right as intended.
    const rounds = [1, 2, 3, 4];
    const cols   = rounds.map(r => renderRoundCol(r, region)).join('');

    return `<div class="tb-scroll">
  <div class="tb-region${rtl ? ' tb-region--rtl' : ''}" style="position:relative">
    ${renderConnectors(region, rtl)}
    ${cols}
  </div>
</div>`;
  }

  // ── Render Final Four tab ─────────────────────────────────────────────────
  // Layout:
  //   top half   — East winner vs South winner (left-to-right)
  //   bottom half — Midwest winner vs West winner (right-to-left)
  //   center     — Championship game

  function renderFinalFourPanel() {
    const ff1   = _state.games.find(g => g.round === 5 && g.id === 'final_four-r5-g1');
    const ff2   = _state.games.find(g => g.round === 5 && g.id === 'final_four-r5-g2');
    const champ = _state.games.find(g => g.round === 6);

    const pending = `<div class="tb-game tb-game--locked"><span class="tb-locked-txt">Results pending</span></div>`;

    const ff1HTML   = ff1   ? gameNodeHTML(ff1)   : pending;
    const ff2HTML   = ff2   ? gameNodeHTML(ff2)   : pending;
    const champHTML = champ ? gameNodeHTML(champ) : pending;

    return `<div class="tb-ff-wrap">

  <div class="tb-ff-half">
    <div class="tb-ff-labels">
      <div class="tb-ff-rlabel">East</div>
      <div class="tb-ff-rlabel tb-ff-rlabel--sub">Regional Winner</div>
    </div>
    <div class="tb-ff-connector tb-ff-connector--right"></div>
    <div class="tb-ff-game-wrap">
      <div class="tb-ff-glabel">Semi-Final 1</div>
      ${ff1HTML}
    </div>
    <div class="tb-ff-connector tb-ff-connector--right"></div>
    <div class="tb-ff-labels">
      <div class="tb-ff-rlabel">South</div>
      <div class="tb-ff-rlabel tb-ff-rlabel--sub">Regional Winner</div>
    </div>
  </div>

  <div class="tb-ff-champ">
    <div class="tb-ff-clabel">&#127942; National Championship</div>
    <div class="tb-ff-champ-game">${champHTML}</div>
    <div id="tb-champion-display"></div>
  </div>

  <div class="tb-ff-half tb-ff-half--rtl">
    <div class="tb-ff-labels">
      <div class="tb-ff-rlabel">Midwest</div>
      <div class="tb-ff-rlabel tb-ff-rlabel--sub">Regional Winner</div>
    </div>
    <div class="tb-ff-connector tb-ff-connector--left"></div>
    <div class="tb-ff-game-wrap">
      <div class="tb-ff-glabel">Semi-Final 2</div>
      ${ff2HTML}
    </div>
    <div class="tb-ff-connector tb-ff-connector--left"></div>
    <div class="tb-ff-labels">
      <div class="tb-ff-rlabel">West</div>
      <div class="tb-ff-rlabel tb-ff-rlabel--sub">Regional Winner</div>
    </div>
  </div>

</div>`;
  }

  // ── Inject styles ─────────────────────────────────────────────────────────

  function injectStyles() {
    if (document.getElementById('tb-styles')) return;
    const s = document.createElement('style');
    s.id = 'tb-styles';
    s.textContent = `
/* ── Bracket wrapper ── */
.tb-wrap {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ── Tabs ── */
.tb-tabs {
  display: flex;
  gap: 0;
  padding: 12px 16px 0;
  background: var(--card-bg, #fff);
  border-bottom: 2px solid var(--border, #dde3ee);
  overflow-x: auto;
}
.tb-tab {
  background: none;
  border: none;
  padding: 8px 18px;
  margin-bottom: -2px;
  font-size: .82rem;
  font-weight: 700;
  color: var(--text-muted, #6b7a99);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  white-space: nowrap;
  transition: color .12s;
  letter-spacing: .2px;
}
.tb-tab:hover { color: var(--text, #0d2240); }
.tb-tab--active {
  color: var(--accent, #e8600a);
  border-bottom-color: var(--accent, #e8600a);
}

/* ── Panels ── */
.tb-panel { display: none; }
.tb-panel--active { display: block; }

/* ── Scroll wrapper ── */
.tb-scroll { overflow-x: auto; padding: 18px 16px 12px; }

/* ── Region row ── */
.tb-region {
  display: flex;
  align-items: flex-start;
  min-width: max-content;
}
.tb-region--rtl { flex-direction: row-reverse; }
.tb-connectors { display: block; }

/* ── Round column ── */
.tb-col {
  width: ${COL_W}px;
  flex-shrink: 0;
}
.tb-col-hdr {
  text-align: center;
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .55px;
  color: var(--text-muted, #6b7a99);
  padding: 0 6px 8px;
  border-bottom: 1px solid var(--border, #dde3ee);
  height: 28px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.tb-col-body {
  display: flex;
  flex-direction: column;
}

/* ── Spacer ── */
.tb-spacer { flex-shrink: 0; }

/* ── Slot ── */
.tb-slot {
  height: ${SLOT_H}px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 4px 10px;
}

/* ── Game node ── */
.tb-game {
  width: 100%;
  background: var(--card-bg, #fff);
  border: 1.5px solid var(--border, #dde3ee);
  border-radius: 7px;
  overflow: hidden;
  font-size: .77rem;
  box-shadow: 0 1px 3px rgba(13,34,64,.07);
  transition: box-shadow .12s, border-color .12s;
}
.tb-game--empty {
  background: transparent;
  border-color: transparent;
  box-shadow: none;
}
.tb-game--placeholder {
  background: var(--surface, #f0f4f8);
  border-color: var(--border, #dde3ee);
  border-style: dashed;
  box-shadow: none;
}
.tb-name--tbd {
  color: var(--text-muted, #6b7a99) !important;
  font-weight: 400;
  font-style: italic;
}
.tb-game--locked {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 62px;
  background: #f8f9fb;
  border-color: #e4e9f0;
  border-style: dashed;
}
.tb-locked-txt {
  font-size: .7rem;
  color: var(--text-muted, #6b7a99);
  text-align: center;
  padding: 8px;
}
.tb-game--complete { border-color: #c8d8e8; }
.tb-game--next-up {
  border-color: var(--accent, #e8600a);
  box-shadow: 0 0 0 2px rgba(232,96,10,.2);
}

/* Reveal animation played by animateRoundResults */
.tb-game--reveal {
  animation: tb-reveal .45s ease;
}
@keyframes tb-reveal {
  0%   { transform: scale(.96); opacity: .4;
         box-shadow: 0 0 0 3px rgba(232,96,10,.4); }
  60%  { transform: scale(1.01); }
  100% { transform: scale(1); opacity: 1; }
}

/* ── Team rows ── */
.tb-team {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  min-height: 27px;
}
.tb-winner { background: rgba(26, 127, 55, .07); }
.tb-loser  { opacity: .5; }
.tb-sep { height: 1px; background: var(--border, #dde3ee); }

.tb-seed {
  font-size: .62rem;
  font-weight: 700;
  color: var(--text-muted, #6b7a99);
  min-width: 16px;
  text-align: center;
  flex-shrink: 0;
}
.tb-name {
  flex: 1;
  font-size: .73rem;
  font-weight: 600;
  color: var(--text, #0d2240);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tb-score {
  font-size: .76rem;
  font-weight: 700;
  color: var(--text, #0d2240);
  min-width: 22px;
  text-align: right;
  flex-shrink: 0;
}
.tb-winner .tb-name,
.tb-winner .tb-score { color: #1a7f37; font-weight: 700; }

/* ── Play button ── */
.tb-play-btn {
  display: block;
  width: calc(100% - 12px);
  margin: 3px 6px 5px;
  padding: 3px 0;
  background: var(--accent, #e8600a);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: .67rem;
  font-weight: 700;
  letter-spacing: .4px;
  cursor: pointer;
  text-align: center;
  transition: background .12s;
}
.tb-play-btn:hover { background: #c85008; }

/* ── Final Four layout ── */
.tb-ff-wrap {
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 20px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* Semi-final row */
.tb-ff-half {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 16px 0;
}
.tb-ff-half--rtl { flex-direction: row-reverse; }

.tb-ff-labels {
  flex: 1;
  text-align: center;
  padding: 0 12px;
}
.tb-ff-rlabel {
  font-size: .8rem;
  font-weight: 700;
  color: var(--text, #0d2240);
  line-height: 1.5;
}
.tb-ff-rlabel--sub {
  font-size: .68rem;
  font-weight: 500;
  color: var(--text-muted, #6b7a99);
}

/* Arrow connectors between label → game */
.tb-ff-connector {
  width: 24px;
  height: 2px;
  background: var(--border, #dde3ee);
  flex-shrink: 0;
}

.tb-ff-game-wrap {
  width: 240px;
  flex-shrink: 0;
}
.tb-ff-glabel {
  font-size: .62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .5px;
  color: var(--text-muted, #6b7a99);
  text-align: center;
  margin-bottom: 6px;
}

/* Championship section */
.tb-ff-champ {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  border-top: 1px solid var(--border, #dde3ee);
  border-bottom: 1px solid var(--border, #dde3ee);
  gap: 8px;
}
.tb-ff-clabel {
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .7px;
  color: var(--accent, #e8600a);
  margin-bottom: 4px;
}
.tb-ff-champ-game .tb-game { width: 268px; }

/* ── Champion display ── */
.tb-champion {
  text-align: center;
  margin-top: 10px;
  padding: 20px 32px;
  background: linear-gradient(135deg, #fffbf0 0%, #fff3da 100%);
  border: 2px solid #e8b84b;
  border-radius: 14px;
  min-width: 268px;
}
.tb-champion-trophy { font-size: 2.2rem; margin-bottom: 4px; line-height: 1; }
.tb-champion-label {
  font-size: .65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: #8a6a00;
  margin-bottom: 4px;
}
.tb-champion-name {
  font-size: 1.3rem;
  font-weight: 900;
  color: var(--primary, #0d2240);
  letter-spacing: -.3px;
  line-height: 1.2;
}
.tb-champion-sub {
  font-size: .74rem;
  color: var(--text-muted, #6b7a99);
  margin-top: 3px;
}
`;
    document.head.appendChild(s);
  }

  // ── Public: render ────────────────────────────────────────────────────────

  function render(containerId) {
    _container = containerId;
    _state     = Tournament.load();

    const el = document.getElementById(containerId);
    if (!el) return;

    if (!_state) {
      el.innerHTML = '<p style="padding:20px;color:var(--text-muted,#6b7a99)">No active tournament.</p>';
      return;
    }

    injectStyles();

    const TABS = ['East', 'South', 'Midwest', 'West', 'Final Four'];

    // Tab bar
    let tabsHTML = '<div class="tb-tabs">';
    for (const tab of TABS) {
      const active = tab === _activeTab ? ' tb-tab--active' : '';
      tabsHTML += `<button class="tb-tab${active}" data-tab="${esc(tab)}">${esc(tab)}</button>`;
    }
    tabsHTML += '</div>';

    // Panels
    let panelsHTML = '';
    for (const tab of TABS) {
      const active  = tab === _activeTab ? ' tb-panel--active' : '';
      const content = tab === 'Final Four'
        ? renderFinalFourPanel()
        : renderRegionPanel(tab);
      panelsHTML += `<div class="tb-panel${active}" data-panel="${esc(tab)}">${content}</div>`;
    }

    el.innerHTML = `<div class="tb-wrap">${tabsHTML}${panelsHTML}</div>`;

    // Wire tab clicks
    el.querySelectorAll('.tb-tab').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });
  }

  // ── Public: setActiveTab ──────────────────────────────────────────────────

  function setActiveTab(region) {
    _activeTab = region;
    if (!_container) return;
    const el = document.getElementById(_container);
    if (!el) return;
    el.querySelectorAll('.tb-tab').forEach(btn => {
      btn.classList.toggle('tb-tab--active', btn.dataset.tab === region);
    });
    el.querySelectorAll('.tb-panel').forEach(panel => {
      panel.classList.toggle('tb-panel--active', panel.dataset.panel === region);
    });
  }

  // ── Public: animateRoundResults ───────────────────────────────────────────
  // Reveals game results one-by-one with a 500ms delay, updating the DOM
  // in-place (no full re-render). Calls callback() when all games are shown.

  function animateRoundResults(region, games, callback) {
    let i = 0;

    function revealNext() {
      if (i >= games.length) {
        if (typeof callback === 'function') callback();
        return;
      }
      const game = games[i++];
      // Skip the player's game — it stays in "next up" state with PLAY button
      if (game.isPlayerGame) { setTimeout(revealNext, 0); return; }
      // Find the node anywhere in the bracket (may be in any panel)
      const node = document.querySelector(
        `[data-game-id="${CSS.escape(game.id)}"]`
      );

      if (node) {
        // Update scores
        const teams = node.querySelectorAll('.tb-team');
        if (teams.length >= 2) {
          const hScoreEl = teams[0].querySelector('.tb-score');
          const aScoreEl = teams[1].querySelector('.tb-score');
          if (hScoreEl) hScoreEl.textContent = String(game.homeScore ?? '');
          if (aScoreEl) aScoreEl.textContent = String(game.awayScore ?? '');
        }
        // Apply winner / loser classes
        if (game.winnerId && teams.length >= 2) {
          const homeWon = game.winnerId === game.homeTeamId;
          teams[0].classList.toggle('tb-winner', homeWon);
          teams[0].classList.toggle('tb-loser', !homeWon);
          teams[1].classList.toggle('tb-winner', !homeWon);
          teams[1].classList.toggle('tb-loser', homeWon);
        }
        // Status class
        node.classList.remove('tb-game--pending', 'tb-game--next-up');
        node.classList.add('tb-game--complete', 'tb-game--reveal');
        // Remove animation class after it finishes
        const onEnd = () => {
          node.classList.remove('tb-game--reveal');
          node.removeEventListener('animationend', onEnd);
        };
        node.addEventListener('animationend', onEnd);
      }

      setTimeout(revealNext, 500);
    }

    revealNext();
  }

  // ── Public: showChampion ──────────────────────────────────────────────────
  // Renders a champion display card on the Final Four tab and switches to it.

  function showChampion(team) {
    setActiveTab('Final Four');
    const el = document.getElementById('tb-champion-display');
    if (!el || !team) return;
    const seed = teamSeed(team.id);
    const seedStr = seed ? `Seed #${esc(seed)}` : '';
    const confStr = team.conference ? esc(team.conference) : '';
    const sub = [seedStr, confStr].filter(Boolean).join(' &mdash; ');
    el.innerHTML = `<div class="tb-champion">
  <div class="tb-champion-trophy">&#127942;</div>
  <div class="tb-champion-label">National Champions</div>
  <div class="tb-champion-name">${esc(team.name)}</div>
  ${sub ? `<div class="tb-champion-sub">${sub}</div>` : ''}
</div>`;
  }

  // ── Expose public API ─────────────────────────────────────────────────────

  return { render, setActiveTab, animateRoundResults, showChampion };

})();
