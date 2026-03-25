// HOW TO USE:
// 1. Open https://www.sports-reference.com/cbb/seasons/men/2026-school-ratings.html
// 2. Open DevTools console (F12)
// 3. Paste this entire script and press Enter
// 4. Copy the shell script block printed at the end
// 5. Paste and run it in your project terminal

// ── Our 56 team slugs (underscores — matches SR slug generation) ──────────────
const OUR_TEAMS = [
  'arizona', 'arizona_state', 'baylor', 'byu', 'butler',
  'clemson', 'connecticut', 'creighton', 'depaul', 'duke', 'florida',
  'georgetown', 'georgia', 'georgia_tech', 'houston', 'illinois', 'indiana',
  'iowa', 'iowa_state', 'kansas', 'kentucky', 'louisville', 'marquette',
  'maryland', 'miami_fl', 'michigan', 'michigan_state', 'minnesota',
  'missouri', 'nebraska', 'north_carolina', 'northwestern', 'notre_dame',
  'ohio_state', 'oregon', 'penn_state', 'providence', 'purdue', 'rutgers',
  'seton_hall', 'smu', 'st_johns', 'syracuse', 'tcu', 'tennessee',
  'texas_tech', 'ucla', 'usc', 'vanderbilt', 'villanova', 'virginia',
  'wake_forest', 'washington', 'wisconsin', 'xavier',
];

// Fallback: our slug → exact display name on SR when slug matching fails
const FALLBACK_NAMES = {
  miami_fl:  'Miami (FL)',
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
// SR uses a <table id="ratings"> or wraps it in a div#div_ratings
const table = document.querySelector('table#ratings, div#div_ratings table');
if (!table) {
  console.error('[extract_ratings] Could not find ratings table. Make sure you are on the correct page.');
  throw new Error('Ratings table not found');
}

// ── Step 2: Find the NRtg column index from the header row ───────────────────
// The column header may appear as "NRtg", "Nrtg", or "Net Rtg"
const headerRow = table.querySelector('thead tr:last-child');
if (!headerRow) {
  console.error('[extract_ratings] Could not find table header row.');
  throw new Error('Table header not found');
}

const headers = Array.from(headerRow.querySelectorAll('th, td')).map(el => el.textContent.trim());
const nrtgIdx = headers.findIndex(h => /nrtg|net.?rtg|ntrg/i.test(h));
const schoolIdx = headers.findIndex(h => /school/i.test(h));

if (nrtgIdx === -1) {
  console.warn('[extract_ratings] NRtg column not found. Headers found:', headers);
  throw new Error('NRtg column not found — check header names above');
}

console.log(`[extract_ratings] Using column ${schoolIdx} for School, column ${nrtgIdx} for NRtg`);

// ── Step 3: Parse all data rows ───────────────────────────────────────────────
const allSchools = {};  // slug → { name, net_rating }

const rows = table.querySelectorAll('tbody tr');
for (const row of rows) {
  // Skip header rows injected mid-table by SR
  if (row.classList.contains('thead')) continue;

  const cells = row.querySelectorAll('th, td');
  if (cells.length <= Math.max(schoolIdx, nrtgIdx)) continue;

  const schoolCell = cells[schoolIdx];
  const link = schoolCell.querySelector('a');
  const schoolName = (link || schoolCell).textContent.trim();
  if (!schoolName) continue;

  const nrtgText = cells[nrtgIdx].textContent.trim();
  const nrtg = parseFloat(nrtgText);
  if (isNaN(nrtg)) continue;

  const slug = toSlug(schoolName);
  allSchools[slug] = { name: schoolName, net_rating: nrtg };
}

console.log(`[extract_ratings] Parsed ${Object.keys(allSchools).length} schools from the page.`);

// ── Step 4: Build reverse lookup by display name (for fallback matching) ──────
const allByName = {};
for (const { name, net_rating } of Object.values(allSchools)) {
  allByName[name] = net_rating;
}

// ── Step 5: Match our 56 teams ────────────────────────────────────────────────
const matchResults = [];

for (const ourSlug of OUR_TEAMS) {
  let matched   = null;
  let matchedBy = null;

  // Try exact slug match
  if (allSchools[ourSlug]) {
    matched   = allSchools[ourSlug];
    matchedBy = 'slug';
  }

  // Try fallback display-name match
  if (!matched && FALLBACK_NAMES[ourSlug]) {
    const fallbackName = FALLBACK_NAMES[ourSlug];
    if (allByName[fallbackName] !== undefined) {
      matched   = { name: fallbackName, net_rating: allByName[fallbackName] };
      matchedBy = 'fallback';
    }
  }

  // Convert our underscore slug to hyphen form for set_ratings.py commands
  const dataId = ourSlug.replace(/_/g, '-');

  matchResults.push({
    our_slug:   ourSlug,
    data_id:    dataId,
    sr_name:    matched ? matched.name : 'NO MATCH',
    net_rating: matched ? matched.net_rating : null,
    match_by:   matched ? matchedBy : '—',
  });
}

// ── Step 6A: Match report table ───────────────────────────────────────────────
console.log('\n--- MATCH REPORT ---');
console.table(
  matchResults.map(r => ({
    our_slug:   r.our_slug,
    sr_name:    r.sr_name,
    net_rating: r.net_rating !== null ? r.net_rating : 'NO MATCH',
    match_by:   r.match_by,
  }))
);

const matched   = matchResults.filter(r => r.net_rating !== null);
const unmatched = matchResults.filter(r => r.net_rating === null);
console.log(`Matched: ${matched.length} / ${OUR_TEAMS.length}    Unmatched: ${unmatched.length}`);

// ── Step 6B: Ready-to-run shell script block ──────────────────────────────────
const lines = ['#!/bin/bash', '# Generated by extract_ratings.js — paste into project terminal', ''];

for (const r of matchResults) {
  if (r.net_rating !== null) {
    lines.push(`python set_ratings.py ${r.data_id} ${r.net_rating}`);
  } else {
    lines.push(`# NO MATCH: ${r.our_slug} — verify manually`);
  }
}

console.log('\n--- SHELL SCRIPT (copy and run in terminal) ---');
console.log(lines.join('\n'));
