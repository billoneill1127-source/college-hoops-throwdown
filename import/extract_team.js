// extract_team.js
//
// HOW TO USE (takes ~30 seconds per team):
// 1. Go to the team's sports-reference page, e.g.:
//    https://www.sports-reference.com/cbb/schools/illinois/men/2026.html
// 2. Open browser console: press F12, click "Console" tab
// 3. Paste this entire script and press Enter
// 4. The console will print JSON between ---BEGIN--- and ---END--- markers
// 5. Right-click the output, choose "Copy object" (or select and copy manually)
//    Paste into a new text file, save as e.g. illinois.json in import/team-data/
// 6. Repeat for each team, then run: .\import\combine_teams.ps1
//
// NOTE: If the page asks you to solve a CAPTCHA first, do so,
//       then paste the script again after the page reloads.

(async function() {

  // --- Helpers ---------------------------------------------------------------

  function getFirst(obj, keys) {
    for (const k of keys) if (obj[k] !== undefined && obj[k] !== '') return obj[k];
    return null;
  }

  function parseNum(v) {
    if (v == null || v === '' || v === '.' || v === '-') return null;
    const f = parseFloat(v);
    return isNaN(f) ? null : Math.round(f * 10000) / 10000;
  }

  function normPct(v) {
    const f = parseNum(v);
    if (f == null) return null;
    return f > 1 ? Math.round(f / 100 * 10000) / 10000 : f;
  }

  function convertHt(ht) {
    if (!ht) return null;
    const m = ht.match(/^(\d+)-(\d+)$/);
    return m ? parseInt(m[1]) * 12 + parseInt(m[2]) : null;
  }

  function repsFactor(mp) {
    const m = parseFloat(mp) || 0;
    if (m > 30) return 1.05;
    if (m >= 20) return 1.02;
    if (m >= 15) return 1.00;
    if (m >= 10) return 0.98;
    return 0.95;
  }

  function vetFactor(cls) {
    const c = (cls || '').replace(/\s/g, '').toUpperCase();
    if (c === 'SR') return 1.02;
    if (c === 'FR') return 0.98;
    return 1.00;
  }

  function decodeHtml(s) {
    return s.replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"')
            .trim();
  }

  // --- Extract tables --------------------------------------------------------
  // Fetch raw HTML so we can access tables hidden inside HTML comments

  console.log('Fetching page source...');
  const html = await fetch(location.href).then(r => r.text());

  function extractTable(html, id) {
    const pat = new RegExp(`<table[^>]+id="${id}"[^>]*>[\\s\\S]*?<\\/table>`, 'i');
    let m = html.match(pat);
    if (m) return m[0];
    // Sports-reference sometimes wraps extra tables in HTML comments
    const uncommented = html.replace(/<!--/g, '').replace(/-->/g, '');
    m = uncommented.match(pat);
    return m ? m[0] : null;
  }

  function parseTable(tableHtml) {
    if (!tableHtml) return [];
    const rows = [];
    const trPat = /<tr(?![^>]*class="thead")[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellPat = /<t[dh][^>]+data-stat="([^"]+)"[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let trm;
    while ((trm = trPat.exec(tableHtml)) !== null) {
      const rowHtml = trm[1];
      const row = {};
      let hasPlayer = false;
      let cm;
      cellPat.lastIndex = 0;
      while ((cm = cellPat.exec(rowHtml)) !== null) {
        const stat = cm[1];
        const val  = decodeHtml(cm[2]);
        row[stat]  = val;
        if (stat === 'player' && val && val !== 'Player') hasPlayer = true;
      }
      if (hasPlayer) rows.push(row);
    }
    return rows;
  }

  // --- Parse tables ----------------------------------------------------------

  const rosterRows = parseTable(extractTable(html, 'roster'));
  const pgRows     = parseTable(extractTable(html, 'per_game'));

  let p100Html = extractTable(html, 'per_poss');
  if (!p100Html) p100Html = extractTable(html, 'per_100');
  if (!p100Html) p100Html = extractTable(html, 'per_100_poss');
  const p100Rows = parseTable(p100Html);

  console.log(`Roster: ${rosterRows.length} rows, PerGame: ${pgRows.length} rows, Per100: ${p100Rows.length} rows`);

  if (!rosterRows.length) { console.error('ERROR: Could not parse roster table. Check the page loaded fully.'); return; }

  // --- Build lookup maps -----------------------------------------------------

  const pgMap   = {};
  const p100Map = {};
  const skip = ['TOT', '2TM', '3TM'];

  for (const r of pgRows)   { const n = r.player; if (n && !skip.includes(n) && !pgMap[n])   pgMap[n]   = r; }
  for (const r of p100Rows) { const n = r.player; if (n && !skip.includes(n) && !p100Map[n]) p100Map[n] = r; }

  // --- Build player list -----------------------------------------------------

  const slug = (location.pathname.match(/\/cbb\/schools\/([^/]+)\//) || [])[1] || 'unknown';
  const players = [];

  for (const r of rosterRows) {
    const name = r.player;
    if (!name || !name.trim()) continue;

    const cls  = (getFirst(r, ['class_year', 'class', 'yr']) || '').replace(/\s/g, '').toUpperCase();
    const pg   = pgMap[name]   || {};
    const p100 = p100Map[name] || {};

    const mp   = parseNum(getFirst(pg, ['mp_per_g', 'mp']));
    const reps = repsFactor(mp);
    const vet  = vetFactor(cls);

    function s(v)  { return v == null ? null : Math.round(v * reps * vet * 10000) / 10000; }
    function si(v) { return v == null ? null : Math.round(v / vet * 10000) / 10000; }

    players.push({
      number:   getFirst(r, ['uniform_number', 'number', 'no']) || '',
      name:     name,
      position: getFirst(r, ['pos', 'position']) || '',
      height:   convertHt(getFirst(r, ['height', 'ht'])),
      weight:   parseNum(getFirst(r, ['weight', 'wt'])),
      class:    cls,
      mp:       mp,
      ppg:      parseNum(getFirst(pg, ['pts_per_g', 'pts'])),
      rpg:      parseNum(getFirst(pg, ['trb_per_g', 'trb'])),
      apg:      parseNum(getFirst(pg, ['ast_per_g', 'ast'])),
      bpg:      parseNum(getFirst(pg, ['blk_per_g', 'blk'])),
      spg:      parseNum(getFirst(pg, ['stl_per_g', 'stl'])),
      fga:      s(parseNum(getFirst(p100, ['fga_per_poss', 'fga']))),
      threeP:   s(normPct(getFirst(p100,  ['fg3_pct', '3p_pct']))),
      twoP:     s(normPct(getFirst(p100,  ['fg2_pct', '2p_pct']))),
      ftPct:    s(normPct(getFirst(p100,  ['ft_pct', 'ftpct']))),
      orb:      s(parseNum(getFirst(p100, ['orb_per_poss', 'orb']))),
      drb:      s(parseNum(getFirst(p100, ['drb_per_poss', 'drb']))),
      ast:      s(parseNum(getFirst(p100, ['ast_per_poss', 'ast']))),
      stl:      s(parseNum(getFirst(p100, ['stl_per_poss', 'stl']))),
      blk:      s(parseNum(getFirst(p100, ['blk_per_poss', 'blk']))),
      tov:      si(parseNum(getFirst(p100, ['tov_per_poss', 'tov']))),
      pf:       si(parseNum(getFirst(p100, ['pf_per_poss',  'pf'])))
    });
  }

  console.log(`Built ${players.length} players for ${slug}`);

  // --- Output JSON -----------------------------------------------------------
  // Copy the text below, paste into a new file named  slug + '.json'
  // (e.g. illinois.json), save it in import/team-data/, then run combine_teams.ps1

  const output = { srSlug: slug, players: players };
  const jsonStr = JSON.stringify(output, null, 2);

  console.log('');
  console.log('=== COPY EVERYTHING BETWEEN THE MARKERS BELOW ===');
  console.log('---BEGIN---');
  console.log(jsonStr);
  console.log('---END---');
  console.log('');
  console.log(`Save as: import/team-data/${slug}.json`);

})();
