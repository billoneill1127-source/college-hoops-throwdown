// HOW TO USE:
// 1. Open https://www.sports-reference.com/cbb/seasons/men/2026-school-ratings.html
// 2. Open DevTools console (F12)
// 3. Paste this entire script and press Enter
// 4. JSON will be copied to your clipboard (or a text box appears if clipboard is blocked)
// 5. Paste into: data/ratings.json  (overwrite the entire file)
// 6. Run  node migrate.js  to regenerate data files with the new ratings

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
  // Independent (non-conference opponents)
  'akron', 'austin_peay', 'dayton', 'fordham', 'gonzaga', 'hawaii',
  'high_point', 'illinois_chicago', 'illinois_state', 'loyola_il',
  'loyola_marymount', 'miami_oh', 'mississippi_val', 'pennsylvania',
  'richmond', 'saint_louis', 'saint_marys_ca', 'santa_clara', 'temple',
  'tulane', 'unlv', 'virginia_commonwealth', 'wichita_state', 'yale',
];

// Fallback: our slug → exact display name on SR when slug matching fails
const FALLBACK_NAMES = {
  // Conference teams
  miami_fl:          'Miami (FL)',
  nc_state:          'NC State',
  st_johns:          "St. John's (NY)",
  smu:               'Southern Methodist',
  byu:               'Brigham Young',
  tcu:               'Texas Christian',
  usc:               'Southern California',
  lsu:               'Louisiana State',
  texas_am:          'Texas A&M',
  // Independent teams
  illinois_chicago:  'Illinois-Chicago',
  loyola_il:         'Loyola (IL)',
  miami_oh:          'Miami (OH)',
  mississippi_val:   'Mississippi Valley State',
  saint_marys_ca:    "Saint Mary's",
  unlv:              'Nevada-Las Vegas',
};

// ── Slug generator ────────────────────────────────────────────────────────────
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

// ── Locate ratings table ──────────────────────────────────────────────────────
const table = document.querySelector('table#ratings, div#div_ratings table');
if (!table) {
  alert('ERROR: Ratings table not found. Make sure you are on the correct page.');
  return;
}

// ── Find column indices ───────────────────────────────────────────────────────
const headerRow = table.querySelector('thead tr:last-child');
if (!headerRow) { alert('ERROR: Could not find table header row.'); return; }

const headers   = Array.from(headerRow.querySelectorAll('th, td')).map(el => el.textContent.trim());
const nrtgIdx   = headers.findIndex(h => new RegExp('nrtg|net.rtg|ntrg', 'i').test(h));
const schoolIdx = headers.findIndex(h => new RegExp('school', 'i').test(h));

if (nrtgIdx === -1) {
  alert('ERROR: NRtg column not found.\nHeaders found: ' + headers.join(', '));
  return;
}

// ── Parse all data rows ───────────────────────────────────────────────────────
const allSchools = {};

for (const row of table.querySelectorAll('tbody tr')) {
  if (row.classList.contains('thead')) continue;
  const cells = row.querySelectorAll('th, td');
  if (cells.length <= Math.max(schoolIdx, nrtgIdx)) continue;
  const link       = cells[schoolIdx].querySelector('a');
  const schoolName = (link || cells[schoolIdx]).textContent.trim();
  if (!schoolName) continue;
  const nrtg = parseFloat(cells[nrtgIdx].textContent.trim());
  if (isNaN(nrtg)) continue;
  allSchools[toSlug(schoolName)] = { name: schoolName, net_rating: nrtg };
}

// ── Reverse lookup by display name ───────────────────────────────────────────
const allByName = {};
for (const { name, net_rating } of Object.values(allSchools)) {
  allByName[name] = net_rating;
}

// ── Match our teams ───────────────────────────────────────────────────────────
const ratingsObj = {};
const unmatched  = [];

for (const ourSlug of OUR_TEAMS) {
  let net_rating = null;

  if (allSchools[ourSlug]) {
    net_rating = allSchools[ourSlug].net_rating;
  } else if (FALLBACK_NAMES[ourSlug] && allByName[FALLBACK_NAMES[ourSlug]] !== undefined) {
    net_rating = allByName[FALLBACK_NAMES[ourSlug]];
  }

  // data IDs use hyphens; OUR_TEAMS uses underscores
  const dataId = ourSlug.replace(/_/g, '-');

  if (net_rating !== null) {
    ratingsObj[dataId] = net_rating;
  } else {
    unmatched.push(ourSlug);
  }
}

// ── Build JSON output ─────────────────────────────────────────────────────────
const sorted = Object.fromEntries(
  Object.entries(ratingsObj).sort(([a], [b]) => a.localeCompare(b))
);
const jsonStr = JSON.stringify(sorted, null, 2);

const matched = OUR_TEAMS.length - unmatched.length;
const summary = `Done! ${matched} of ${OUR_TEAMS.length} teams matched.`
  + (unmatched.length ? `\n\nNo match found for:\n  ${unmatched.join(', ')}\nAdd these manually to data/ratings.json.` : '')
  + `\n\nPaste into: data/ratings.json`;

// ── Copy to clipboard or show textarea (same pattern as extract_team.js) ──────
try {
  await navigator.clipboard.writeText(jsonStr);
  alert(summary + '\n\nJSON copied to clipboard.');
} catch (e) {
  const ta = document.createElement('textarea');
  ta.value = jsonStr;
  ta.style.cssText = 'position:fixed;top:10px;left:10px;width:90vw;height:80vh;z-index:99999;font-size:11px;background:#fff;border:3px solid red;padding:8px';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  alert(summary + '\n\nClipboard was blocked.\nA text box has appeared on the page — select all and copy manually.');
}

})();
