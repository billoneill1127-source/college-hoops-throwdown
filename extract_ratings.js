// HOW TO USE:
// 1. Open https://www.sports-reference.com/cbb/seasons/men/2026-school-ratings.html
// 2. Open DevTools console (F12)
// 3. Paste this entire script and press Enter
// 4. Copy the JSON block printed at the end
// 5. Paste it into  data/ratings.json  in your project root
//    (overwrite the entire file contents)
// 6. Run  node migrate.js  to regenerate data files with the new ratings

// ── Our 57 team slugs (underscores — matches SR slug generation) ──────────────
const OUR_TEAMS = [
  'arizona', 'arizona_state', 'arkansas', 'baylor', 'byu', 'butler',
  'clemson', 'connecticut', 'creighton', 'depaul', 'duke', 'florida',
  'georgetown', 'georgia', 'georgia_tech', 'houston', 'illinois', 'indiana',
  'iowa', 'iowa_state', 'kansas', 'kentucky', 'louisville', 'marquette',
  'maryland', 'miami_fl', 'michigan', 'michigan_state', 'minnesota',
  'missouri', 'nc_state', 'nebraska', 'north_carolina', 'northwestern', 'notre_dame',
  'ohio_state', 'oregon', 'penn_state', 'providence', 'purdue', 'rutgers',
  'seton_hall', 'smu', 'st_johns', 'syracuse', 'tcu', 'tennessee',
  'texas_tech', 'ucla', 'usc', 'vanderbilt', 'villanova', 'virginia',
  'wake_forest', 'washington', 'wisconsin', 'xavier',
];

// Fallback: our slug → exact display name on SR when slug matching fails
const FALLBACK_NAMES = {
  miami_fl:  'Miami (FL)',
  nc_state:  'NC State',
  st_johns:  "St. John's (NY)",
  smu:       'Southern Methodist',
  byu:       'Brigham Young',
  tcu:       'Texas Christian',
  usc:       'Southern California',
};

// ── Slug generator (mirrors the logic used for SR school names) ───────────────
function toSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')   // strip special chars (apostrophes, periods, parens…)
    .trim()
    .replace(/\s+/g, '_');
}

// ── Step 1: Locate the ratings table ─────────────────────────────────────────
const table = document.querySelector('table#ratings, div#div_ratings table');
if (!table) {
  console.error('[extract_ratings] Could not find ratings table. Make sure you are on the correct page.');
  throw new Error('Ratings table not found');
}

// ── Step 2: Find the NRtg column index from the header row ───────────────────
// The column header may appear as "NRtg", "Nrtg", "NTrg", or "Net Rtg"
const headerRow = table.querySelector('thead tr:last-child');
if (!headerRow) {
  console.error('[extract_ratings] Could not find table header row.');
  throw new Error('Table header not found');
}

const headers  = Array.from(headerRow.querySelectorAll('th, td')).map(el => el.textContent.trim());
const nrtgIdx  = headers.findIndex(h => /nrtg|net.?rtg|ntrg/i.test(h));
const schoolIdx = headers.findIndex(h => /school/i.test(h));

if (nrtgIdx === -1) {
  console.warn('[extract_ratings] NRtg column not found. Headers found:', headers);
  throw new Error('NRtg column not found — check header names above');
}

console.log(`[extract_ratings] Column ${schoolIdx} = School, column ${nrtgIdx} = NRtg`);

// ── Step 3: Parse all data rows ───────────────────────────────────────────────
const allSchools = {};  // slug → { name, net_rating }

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

console.log(`[extract_ratings] Parsed ${Object.keys(allSchools).length} schools from the page.`);

// ── Step 4: Reverse lookup by display name (for fallback matching) ────────────
const allByName = {};
for (const { name, net_rating } of Object.values(allSchools)) {
  allByName[name] = net_rating;
}

// ── Step 5: Match our teams ───────────────────────────────────────────────────
const matchResults = [];

for (const ourSlug of OUR_TEAMS) {
  let matched   = null;
  let matchedBy = null;

  if (allSchools[ourSlug]) {
    matched   = allSchools[ourSlug];
    matchedBy = 'slug';
  }

  if (!matched && FALLBACK_NAMES[ourSlug]) {
    const fb = FALLBACK_NAMES[ourSlug];
    if (allByName[fb] !== undefined) {
      matched   = { name: fb, net_rating: allByName[fb] };
      matchedBy = 'fallback';
    }
  }

  // Our data IDs use hyphens; OUR_TEAMS uses underscores
  const dataId = ourSlug.replace(/_/g, '-');

  matchResults.push({ our_slug: ourSlug, data_id: dataId,
    sr_name: matched ? matched.name : 'NO MATCH',
    net_rating: matched ? matched.net_rating : null,
    match_by: matched ? matchedBy : '—' });
}

// ── Step 6A: Match report table ───────────────────────────────────────────────
console.log('\n--- MATCH REPORT ---');
console.table(matchResults.map(r => ({
  our_slug:   r.our_slug,
  sr_name:    r.sr_name,
  net_rating: r.net_rating !== null ? r.net_rating : 'NO MATCH',
  match_by:   r.match_by,
})));

const matched_   = matchResults.filter(r => r.net_rating !== null);
const unmatched_ = matchResults.filter(r => r.net_rating === null);
console.log(`Matched: ${matched_.length} / ${OUR_TEAMS.length}    Unmatched: ${unmatched_.length}`);

if (unmatched_.length > 0) {
  console.warn('Unmatched teams:', unmatched_.map(r => r.our_slug).join(', '));
}

// ── Step 6B: ratings.json block — paste into data/ratings.json ───────────────
// Build an object keyed by hyphen data_id (matches keys used by migrate.js and set_ratings.py)
const ratingsObj = {};
for (const r of matchResults) {
  if (r.net_rating !== null) {
    ratingsObj[r.data_id] = r.net_rating;
  }
}

// Sort keys alphabetically for clean diffs
const sorted = Object.fromEntries(
  Object.entries(ratingsObj).sort(([a], [b]) => a.localeCompare(b))
);

const jsonBlock = JSON.stringify(sorted, null, 2);

console.log('\n--- PASTE THIS INTO data/ratings.json (overwrite entire file) ---');
console.log(jsonBlock);
console.log('--- END ratings.json ---');

// Also log unmatched as a reminder
if (unmatched_.length > 0) {
  console.log('\n--- UNMATCHED — add these manually to data/ratings.json when known ---');
  for (const r of unmatched_) {
    console.log(`  // "${r.data_id}": <net_rating>`);
  }
}
