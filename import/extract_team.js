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
        // roster uses 'player'; stats tables use 'name_display'
        if ((stat === 'player' || stat === 'name_display') && val && val !== 'Player') hasPlayer = true;
      });
      if (hasPlayer) rows.push(row);
    });
    return rows;
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

  const players = [];
  for (const r of rosterRows) {
    const name = r.player||r.name_display;
    if (!name || !name.trim()) continue;
    const cls  = (getFirst(r,['class_year','class','yr'])||'').replace(/\s/g,'').toUpperCase();
    const pg   = pgMap[name]   || {};
    const p100 = p100Map[name] || {};
    const mp   = parseNum(getFirst(pg,['mp_per_g','mp']));
    const reps = repsFactor(mp), vet = vetFactor(cls);
    const s  = v => v == null ? null : Math.round(v * reps * vet * 10000) / 10000;
    const si = v => v == null ? null : Math.round(v / vet * 10000) / 10000;
    players.push({
      number:   getFirst(r,['uniform_number','number','no'])||'',
      name, position: getFirst(r,['pos','position'])||'',
      height: convertHt(getFirst(r,['height','ht'])),
      weight: parseNum(getFirst(r,['weight','wt'])),
      class: cls, mp,
      ppg: parseNum(getFirst(pg,['pts_per_g','pts'])),
      rpg: parseNum(getFirst(pg,['trb_per_g','trb'])),
      apg: parseNum(getFirst(pg,['ast_per_g','ast'])),
      bpg: parseNum(getFirst(pg,['blk_per_g','blk'])),
      spg: parseNum(getFirst(pg,['stl_per_g','stl'])),
      fga:    s(parseNum(getFirst(p100,['fga_per_poss','fga']))),
      threeP: s(normPct(getFirst(p100,['fg3_pct','3p_pct']))),
      twoP:   s(normPct(getFirst(p100,['fg2_pct','2p_pct']))),
      ftPct:  s(normPct(getFirst(p100,['ft_pct','ftpct']))),
      orb:  s(parseNum(getFirst(p100,['orb_per_poss','orb']))),
      drb:  s(parseNum(getFirst(p100,['drb_per_poss','drb']))),
      ast:  s(parseNum(getFirst(p100,['ast_per_poss','ast']))),
      stl:  s(parseNum(getFirst(p100,['stl_per_poss','stl']))),
      blk:  s(parseNum(getFirst(p100,['blk_per_poss','blk']))),
      tov:  si(parseNum(getFirst(p100,['tov_per_poss','tov']))),
      pf:   si(parseNum(getFirst(p100,['pf_per_poss','pf'])))
    });
  }

  const jsonStr = JSON.stringify({ srSlug: slug, players }, null, 2);

  // Copy to clipboard
  try {
    await navigator.clipboard.writeText(jsonStr);
    alert('Done! ' + players.length + ' players for ' + slug + '.\n\nJSON copied to clipboard.\nPaste into: import/team-data/' + slug + '.json');
  } catch(e) {
    // Clipboard blocked — fall back to a selectable text area on the page
    const ta = document.createElement('textarea');
    ta.value = jsonStr;
    ta.style.cssText = 'position:fixed;top:10px;left:10px;width:90vw;height:80vh;z-index:99999;font-size:11px;background:#fff;border:3px solid red;padding:8px';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    alert('Done! ' + players.length + ' players for ' + slug + '.\n\nClipboard was blocked.\nA text box has appeared on the page — select all and copy it manually.\nThen paste into: import/team-data/' + slug + '.json');
  }

})();
