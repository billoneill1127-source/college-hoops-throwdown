// extract_basic_stats.js
// Extracts team_fouls_per_game from the "Basic School Stats" table.
//
// HOW TO USE:
// 1. Open https://www.sports-reference.com/cbb/seasons/men/2026-school-stats.html
// 2. Make sure you are on the "Basic School Stats" tab (default)
// 3. Open DevTools console (F12)
// 4. Paste this entire script and press Enter
// 5. JSON will be copied to your clipboard (or a text box appears if clipboard is blocked)
// 6. Save the output as: import/stats_basic.json
// 7. After all three extract scripts are done, run: node apply_team_stats.js

(async function () {

// ── Our team slugs (underscores — matches SR slug generation) ────────────────
const OUR_TEAMS = [
  // ACC
  'boston_college', 'california', 'clemson', 'duke', 'florida_state',
  'georgia_tech', 'louisville', 'miami_fl', 'nc_state', 'north_carolina',
  'notre_dame', 'pittsburgh', 'smu', 'stanford', 'syracuse', 'virginia',
  'virginia_tech', 'wake_forest',
  // Big 12
  'arizona', 'arizona_state', 'baylor', 'byu', 'cincinnati', 'colorado',
  'houston', 'iowa_state', 'kansas', 'kansas_state', 'oklahoma_state',
  'tcu', 'texas_tech', 'ucf', 'utah', 'west_virginia',
  // Big East
  'butler', 'connecticut', 'creighton', 'depaul', 'georgetown',
  'marquette', 'providence', 'seton_hall', 'st_johns', 'villanova', 'xavier',
  // Big Ten
  'illinois', 'indiana', 'iowa', 'maryland', 'michigan', 'michigan_state',
  'minnesota', 'nebraska', 'northwestern', 'ohio_state', 'oregon',
  'penn_state', 'purdue', 'rutgers', 'ucla', 'usc', 'washington', 'wisconsin',
  // SEC
  'alabama', 'arkansas', 'auburn', 'florida', 'georgia', 'kentucky',
  'lsu', 'mississippi', 'mississippi_state', 'missouri', 'south_carolina',
  'tennessee', 'texas_am', 'vanderbilt',
  // Independent
  'akron', 'army', 'austin_peay', 'bradley', 'california_baptist',
  'dayton', 'detroit_mercy', 'fordham', 'gonzaga', 'hawaii',
  'high_point', 'howard', 'illinois_chicago', 'illinois_state', 'liberty',
  'loyola_il', 'loyola_marymount', 'miami_oh', 'mississippi_val',
  'oregon_state', 'pennsylvania', 'pepperdine', 'princeton', 'rice',
  'richmond', 'saint_louis', 'saint_marys_ca', 'santa_clara',
  'st_thomas_mn', 'temple', 'tulane', 'unlv', 'virginia_commonwealth',
  'west_virginia', 'wichita_state', 'wyoming', 'yale',
];

const FALLBACK_NAMES = {
  miami_fl:          'Miami (FL)',
  nc_state:          'NC State',
  st_johns:          "St. John's (NY)",
  smu:               'Southern Methodist',
  byu:               'Brigham Young',
  tcu:               'Texas Christian',
  usc:               'Southern California',
  lsu:               'Louisiana State',
  texas_am:          'Texas A&M',
  illinois_chicago:  'Illinois-Chicago',
  loyola_il:         'Loyola (IL)',
  miami_oh:          'Miami (OH)',
  mississippi_val:   'Mississippi Valley State',
  saint_marys_ca:    "Saint Mary's",
  unlv:              'Nevada-Las Vegas',
  army:              'Army West Point',
  st_thomas_mn:      'St. Thomas',
};

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '_');
}

// ── Find a table that has all required columns ────────────────────────────────
function findTableWithCols(requiredCols) {
  for (const tbl of document.querySelectorAll('table')) {
    const hr = tbl.querySelector('thead tr:last-child');
    if (!hr) continue;
    const hdrs = Array.from(hr.querySelectorAll('th, td')).map(el => el.textContent.trim());
    if (requiredCols.every(c => hdrs.includes(c))) return { tbl, hdrs };
  }
  return null;
}

const found = findTableWithCols(['G', 'PF']);
if (!found) {
  alert('ERROR: No table with G and PF columns found on this page.\n'
    + 'Make sure you are on the "Basic School Stats" tab (default).');
  return;
}
const table   = found.tbl;
const headers = found.hdrs;

// ── Find column indices ───────────────────────────────────────────────────────
const schoolIdx = headers.findIndex(h => /school/i.test(h));
const gIdx      = headers.findIndex(h => h === 'G');
const pfIdx     = headers.findIndex(h => h === 'PF');

// ── Parse all data rows ───────────────────────────────────────────────────────
const allSchools = {};
for (const row of table.querySelectorAll('tbody tr')) {
  if (row.classList.contains('thead')) continue;
  const cells = row.querySelectorAll('th, td');
  const maxIdx = Math.max(schoolIdx, gIdx, pfIdx);
  if (cells.length <= maxIdx) continue;

  const link       = cells[schoolIdx].querySelector('a');
  const schoolName = (link || cells[schoolIdx]).textContent.trim();
  if (!schoolName) continue;

  const g  = parseFloat(cells[gIdx].textContent.trim());
  const pf = parseFloat(cells[pfIdx].textContent.trim());
  if (isNaN(g) || isNaN(pf) || g === 0) continue;

  allSchools[toSlug(schoolName)] = { name: schoolName, team_fouls_per_game: Math.round((pf / g) * 10) / 10 };
}

// ── Reverse lookup by display name ───────────────────────────────────────────
const allByName = {};
for (const { name, team_fouls_per_game } of Object.values(allSchools)) {
  allByName[name] = team_fouls_per_game;
}

// ── Match our teams ───────────────────────────────────────────────────────────
const out       = {};
const unmatched = [];

for (const ourSlug of OUR_TEAMS) {
  let val = null;
  if (allSchools[ourSlug])                               val = allSchools[ourSlug].team_fouls_per_game;
  else if (FALLBACK_NAMES[ourSlug] && allByName[FALLBACK_NAMES[ourSlug]] !== undefined)
                                                          val = allByName[FALLBACK_NAMES[ourSlug]];
  const dataId = ourSlug.replace(/_/g, '-');
  if (val !== null) out[dataId] = { team_fouls_per_game: val };
  else              unmatched.push(ourSlug);
}

// ── Build output ─────────────────────────────────────────────────────────────
const sorted  = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
const jsonStr = JSON.stringify(sorted, null, 2);

const matched = OUR_TEAMS.length - unmatched.length;
const summary = `Done! ${matched} of ${OUR_TEAMS.length} teams matched.`
  + (unmatched.length ? `\n\nNo match found for:\n  ${unmatched.join(', ')}` : '')
  + `\n\nSave output as: import/stats_basic.json`;

try {
  await navigator.clipboard.writeText(jsonStr);
  alert(summary + '\n\nJSON copied to clipboard.');
} catch (e) {
  const ta = document.createElement('textarea');
  ta.value = jsonStr;
  ta.style.cssText = 'position:fixed;top:10px;left:10px;width:90vw;height:80vh;z-index:99999;font-size:11px;background:#fff;border:3px solid red;padding:8px';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  alert(summary + '\n\nClipboard was blocked.\nA text box has appeared — select all and copy manually.');
}

})();
