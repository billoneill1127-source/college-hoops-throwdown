// extract_team.js
//
// HOW TO USE:
// 1. Go to the team's sports-reference page, e.g.:
//    https://www.sports-reference.com/cbb/schools/indiana/men/2026.html
// 2. Wait for the page to fully load
// 3. Open browser console: press F12, click "Console" tab
// 4. Paste this entire script and press Enter
// 5. An alert will pop up when done — JSON is already copied to your clipboard
// 6. Paste into a new text file, save as e.g. indiana.json in import/team-data/
// 7. Repeat for each team, then run: .\import\combine_teams.ps1

(async function() {

  function getFirst(obj, keys) {
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== '') return obj[k];
    return null;
  }
  function parseNum(v) {
    if (v == null || v === '' || v === '.' || v === '-') return null;
    const f = parseFloat(v); return isNaN(f) ? null : Math.round(f * 10000) / 10000;
  }
  function normPct(v) {
    const f = parseNum(v); if (f == null) return null;
    return f > 1 ? Math.round(f / 100 * 10000) / 10000 : f;
  }
  function convertHt(ht) {
    if (!ht) return null;
    const m = ht.match(/^(\d+)-(\d+)$/);
    return m ? parseInt(m[1]) * 12 + parseInt(m[2]) : null;
  }
  function repsFactor(mp) {
    const m = parseFloat(mp) || 0;
    if (m > 30) return 1.05; if (m >= 20) return 1.02;
    if (m >= 15) return 1.00; if (m >= 10) return 0.98; return 0.95;
  }
  function vetFactor(cls) {
    const c = (cls || '').replace(/\s/g,'').toUpperCase();
    return c === 'SR' ? 1.02 : c === 'FR' ? 0.98 : 1.00;
  }

  function waitForTable(id, ms) {
    return new Promise(resolve => {
      const t = document.getElementById(id);
      if (t) { resolve(t); return; }
      const start = Date.now();
      const iv = setInterval(() => {
        const t2 = document.getElementById(id);
        if (t2) { clearInterval(iv); resolve(t2); return; }
        if (Date.now() - start > ms) { clearInterval(iv); resolve(null); }
      }, 400);
    });
  }

  function parseDomTable(tbl) {
    if (!tbl) return [];
    const rows = [];
    tbl.querySelectorAll('tr').forEach(tr => {
      if (tr.classList.contains('thead')) return;
      const row = {}; let hasPlayer = false;
      tr.querySelectorAll('td[data-stat],th[data-stat]').forEach(cell => {
        const stat = cell.getAttribute('data-stat');
        const val  = cell.innerText.trim();
        row[stat] = val;
        if ((stat === 'player' || stat === 'name_display') && val && val !== 'Player') hasPlayer = true;
      });
      if (hasPlayer) rows.push(row);
    });
    return rows;
  }

  // Find the "Team" or "Opponent" totals row in the per-game table
  // Searches tfoot first, then full table; tries multiple label variations
  function findTotalsRow(tbl, labels) {
    if (!tbl) return null;
    const labelSet = Array.isArray(labels) ? labels : [labels];
    // Search tfoot first (most common on Sports Reference)
    const sections = [tbl.querySelector('tfoot'), tbl].filter(Boolean);
    for (const section of sections) {
      for (const tr of section.querySelectorAll('tr')) {
        for (const cell of tr.querySelectorAll('td, th')) {
          if (labelSet.includes(cell.innerText.trim())) return tr;
        }
      }
    }
    return null;
  }

  // Diagnostic: log bottom rows of table so we can see actual labels if nulls appear
  function logBottomRows(tbl, n, tableName) {
    if (!tbl) { console.log(tableName + ': table not found'); return; }
    const tfoot = tbl.querySelector('tfoot');
    if (tfoot) {
      console.log(tableName + ' tfoot rows:');
      tfoot.querySelectorAll('tr').forEach((tr, i) => console.log('  tfoot[' + i + ']:', tr.innerText.trim().substring(0, 120)));
    }
    const allRows = [...tbl.querySelectorAll('tbody tr')];
    console.log(tableName + ' last ' + n + ' tbody rows:');
    allRows.slice(-n).forEach((tr, i) => console.log('  row[' + i + ']:', tr.innerText.trim().substring(0, 120)));
  }

  function getStat(row, statName) {
    if (!row) return null;
    const cell = row.querySelector(`[data-stat="${statName}"]`);
    return cell ? parseNum(cell.innerText.trim()) : null;
  }

  const slug = (location.pathname.match(/\/cbb\/schools\/([^/]+)\//) || [])[1] || 'unknown';

  const [rosterTbl, pgTbl, p100Tbl] = await Promise.all([
    waitForTable('roster',           5000),
    waitForTable('players_per_game', 10000),
    Promise.race([
      waitForTable('players_per_poss', 10000),
      waitForTable('per_poss',         10000),
      waitForTable('per_100',          10000),
    ])
  ]);

  const rosterRows = parseDomTable(rosterTbl);
  const pgRows     = parseDomTable(pgTbl);
  const p100Rows   = parseDomTable(p100Tbl);

  if (!rosterRows.length) {
    alert('ERROR: Roster table not found. Make sure the page is fully loaded.');
    return;
  }

  const pgMap = {}, p100Map = {}, skip = ['TOT','2TM','3TM'];
  for (const r of pgRows)   { const n=r.name_display||r.player; if(n&&!skip.includes(n)&&!pgMap[n])   pgMap[n]=r; }
  for (const r of p100Rows) { const n=r.name_display||r.player; if(n&&!skip.includes(n)&&!p100Map[n]) p100Map[n]=r; }

  // Fuzzy lookup: exact match first, then check if any stat-table name starts
  // with the roster name (handles suffixes like Jr., Sr., III, etc.)
  function findInMap(map, rosterName) {
    if (map[rosterName]) return map[rosterName];
    const lower = rosterName.toLowerCase().trim();
    for (const [k, v] of Object.entries(map)) {
      if (k.toLowerCase().startsWith(lower + ' ') || k.toLowerCase().startsWith(lower + ',')) return v;
    }
    return null;
  }

  // ── PLAYER DATA ──────────────────────────────────────────────────────────────
  const players = [];
  for (const r of rosterRows) {
    const name = r.player||r.name_display;
    if (!name || !name.trim()) continue;
    const cls  = (getFirst(r,['class_year','class','yr'])||'').replace(/\s/g,'').toUpperCase();
    const pg   = findInMap(pgMap,   name) || {};
    const p100 = findInMap(p100Map, name) || {};
    const mp   = parseNum(getFirst(pg,['mp_per_g','mp']));
    const reps = repsFactor(mp), vet = vetFactor(cls);
    const s  = v => v == null ? null : Math.round(v * reps * vet * 10000) / 10000;
    const si = v => v == null ? null : Math.round(v / vet * 10000) / 10000;
    players.push({
      number:   getFirst(r,['uniform_number','number','no'])||'',
      name, position: getFirst(r,['pos','position'])||'',
      height: convertHt(getFirst(r,['height','ht'])),
      weight: parseNum(getFirst(r,['weight','wt'])),
      class: cls, minutes_per_game: mp,
      ppg: parseNum(getFirst(pg,['pts_per_g','pts'])),
      rpg: parseNum(getFirst(pg,['trb_per_g','trb'])),
      apg: parseNum(getFirst(pg,['ast_per_g','ast'])),
      bpg: parseNum(getFirst(pg,['blk_per_g','blk'])),
      spg: parseNum(getFirst(pg,['stl_per_g','stl'])),
      fga_per_100:                   s(parseNum(getFirst(p100,['fga_per_poss','fga']))),
      three_pa_per_100:              s(parseNum(getFirst(p100,['fg3a_per_poss','fg3a']))),
      three_point_pct:               normPct(getFirst(p100,['fg3_pct','3p_pct'])),
      two_point_pct:                 normPct(getFirst(p100,['fg2_pct','2p_pct'])),
      free_throw_pct:                normPct(getFirst(p100,['ft_pct','ftpct'])),
      offensive_rebounds_per_100:    s(parseNum(getFirst(p100,['orb_per_poss','orb']))),
      defensive_rebounds_per_100:    s(parseNum(getFirst(p100,['drb_per_poss','drb']))),
      assists_per_100:               s(parseNum(getFirst(p100,['ast_per_poss','ast']))),
      steals_per_100:                s(parseNum(getFirst(p100,['stl_per_poss','stl']))),
      blocks_per_100:                s(parseNum(getFirst(p100,['blk_per_poss','blk']))),
      turnovers_per_100:             si(parseNum(getFirst(p100,['tov_per_poss','tov']))),
      personal_fouls_per_100:        si(parseNum(getFirst(p100,['pf_per_poss','pf'])))
    });
  }

  // ── TEAM-LEVEL STATS ─────────────────────────────────────────────────────────
  // Pulled from the "Team" and "Opponent" totals rows in the per-game table
  const teamRow = findTotalsRow(pgTbl, ['Team', 'School', 'Team Total']);
  const oppRow  = findTotalsRow(pgTbl, ['Opponent', 'Opp.', 'Opponents']);

  const tFG  = getStat(teamRow, 'fg');
  const tAST = getStat(teamRow, 'ast');
  const tORB = getStat(teamRow, 'orb');
  const tDRB = getStat(teamRow, 'drb');
  const tFGA = getStat(teamRow, 'fga');
  const tFTA = getStat(teamRow, 'fta');
  const tTOV = getStat(teamRow, 'tov');
  const tPF  = getStat(teamRow, 'pf');
  const oORB = getStat(oppRow,  'orb');
  const oDRB = getStat(oppRow,  'drb');

  // Possessions ≈ FGA - ORB + TOV + 0.44 * FTA (standard approximation)
  const possessions_per_game =
    (tFGA != null && tORB != null && tTOV != null && tFTA != null)
      ? Math.round((tFGA - tORB + tTOV + 0.44 * tFTA) * 100) / 100
      : null;

  // ORB% = team ORB / (team ORB + opponent DRB)
  const offensive_rebound_pct =
    (tORB != null && oDRB != null)
      ? Math.round(tORB / (tORB + oDRB) * 10000) / 10000
      : null;

  // DRB% = team DRB / (team DRB + opponent ORB)
  const defensive_rebound_pct =
    (tDRB != null && oORB != null)
      ? Math.round(tDRB / (tDRB + oORB) * 10000) / 10000
      : null;

  // Assist rate = assists / field goals made
  const assist_rate =
    (tFG && tAST != null)
      ? Math.round(tAST / tFG * 10000) / 10000
      : null;

  // Head coach — pulled from the school info box on the page
  let head_coach = null;
  for (const p of document.querySelectorAll('p')) {
    if (p.innerText.includes('Coach:') || p.innerText.includes('Head Coach:')) {
      const a = p.querySelector('a');
      if (a) { head_coach = a.innerText.trim(); break; }
    }
  }

  const team = {
    possessions_per_game:  possessions_per_game  ?? 70,
    offensive_rebound_pct: offensive_rebound_pct ?? 0.28,
    defensive_rebound_pct: defensive_rebound_pct ?? 0.72,
    assist_rate:           assist_rate           ?? 0.54,
    team_fouls_per_game:   tPF                   ?? 18,
    home_fg_bonus:         0.02,
    head_coach
  };

  // Log what was found so you can spot nulls before saving
  // Build diagnostic block — included in JSON output when rows are missing
  // so you can see exactly what labels Sports Reference is using
  let _debug = null;
  if (!teamRow || !oppRow) {
    const tfoot = pgTbl ? pgTbl.querySelector('tfoot') : null;
    const tfootRows = tfoot
      ? [...tfoot.querySelectorAll('tr')].map(tr => tr.innerText.replace(/\s+/g,' ').trim().substring(0, 150))
      : ['(no tfoot found)'];
    const tbodyRows = pgTbl
      ? [...pgTbl.querySelectorAll('tbody tr')].slice(-4).map(tr => tr.innerText.replace(/\s+/g,' ').trim().substring(0, 150))
      : ['(no tbody found)'];
    _debug = {
      warning: 'teamRow or oppRow not found — team stats are null. See tfootRows/lastTbodyRows below for actual labels.',
      teamRowFound: !!teamRow,
      oppRowFound: !!oppRow,
      tfootRows,
      lastTbodyRows: tbodyRows
    };
  }

  const output = _debug
    ? { srSlug: slug, team, _debug, players }
    : { srSlug: slug, team, players };

  // Also fix the output reference
  const jsonStr = JSON.stringify(output, null, 2);

  try {
    await navigator.clipboard.writeText(jsonStr);
    alert('Done! ' + players.length + ' players for ' + slug + '.\n\nJSON copied to clipboard.\nPaste into: import/team-data/' + slug + '.json\n\nCheck console for team stats — verify no nulls before saving.');
  } catch(e) {
    const ta = document.createElement('textarea');
    ta.value = jsonStr;
    ta.style.cssText = 'position:fixed;top:10px;left:10px;width:90vw;height:80vh;z-index:99999;font-size:11px;background:#fff;border:3px solid red;padding:8px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    alert('Done! ' + players.length + ' players for ' + slug + '.\n\nClipboard was blocked.\nA text box has appeared on the page — select all and copy manually.\nPaste into: import/team-data/' + slug + '.json\n\nCheck console for team stats — verify no nulls before saving.');
  }

})();
