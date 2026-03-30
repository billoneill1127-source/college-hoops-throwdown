// apply_team_stats.js
// Merges the three extracted stat files into data/team_stats.json,
// then calls migrate.js to regenerate data/data.json and data/teams-data.js.
//
// Usage:
//   node apply_team_stats.js
//
// Input files expected in import/:
//   import/stats_basic.json      — team_fouls_per_game
//   import/stats_advanced.json   — possessions_per_game, assist_rate, offensive_rebound_pct
//   import/stats_adv_opp.json    — defensive_rebound_pct
//
// Output:
//   data/team_stats.json         — merged, persists across migrate.js re-runs
//   data/data.json               — regenerated (via migrate.js)
//   data/teams-data.js           — regenerated (via migrate.js)

'use strict';
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const IMPORT_DIR    = path.join(__dirname, 'import');
const DATA_OUT_DIR  = path.join(__dirname, 'data');
const OUT_FILE      = path.join(DATA_OUT_DIR, 'team_stats.json');

const INPUT_FILES = [
  { file: 'stats_basic.json',    label: 'Basic (team_fouls_per_game)' },
  { file: 'stats_advanced.json', label: 'Advanced (possessions_per_game / assist_rate / offensive_rebound_pct)' },
  { file: 'stats_adv_opp.json',  label: 'Adv Opponent (defensive_rebound_pct)' },
];

// ── Load existing team_stats.json (if any) ────────────────────────────────────
let merged = {};
if (fs.existsSync(OUT_FILE)) {
  try {
    merged = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
    console.log(`Loaded existing team_stats.json — ${Object.keys(merged).length} team(s) on file.\n`);
  } catch (e) {
    console.warn(`[WARN] Could not parse existing team_stats.json: ${e.message}\nStarting fresh.\n`);
    merged = {};
  }
}

// ── Merge each input file ─────────────────────────────────────────────────────
let anyLoaded = false;

for (const { file, label } of INPUT_FILES) {
  const filePath = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.log(`  [SKIP] ${file} not found — skipping (${label})`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`  [WARN] Could not parse ${file}: ${e.message} — skipping`);
    continue;
  }

  let count = 0;
  for (const [teamId, stats] of Object.entries(data)) {
    merged[teamId] = { ...(merged[teamId] || {}), ...stats };
    count++;
  }
  console.log(`  Loaded ${file} — ${count} teams  (${label})`);
  anyLoaded = true;
}

if (!anyLoaded) {
  console.error('\nNo input files found. Place extracted JSON files in import/ and re-run.');
  process.exit(1);
}

// ── Write merged team_stats.json ──────────────────────────────────────────────
const sorted   = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
const jsonStr  = JSON.stringify(sorted, null, 2);
fs.writeFileSync(OUT_FILE, jsonStr, 'utf8');

console.log(`\nWrote data/team_stats.json — ${Object.keys(sorted).length} teams, ${jsonStr.length} chars`);

// ── Spot-check a sample entry ─────────────────────────────────────────────────
const sampleKey = Object.keys(sorted)[0];
if (sampleKey) {
  console.log(`\nSample entry [${sampleKey}]:`, JSON.stringify(sorted[sampleKey], null, 2));
}

// ── Stat coverage report ──────────────────────────────────────────────────────
const STAT_FIELDS = [
  'team_fouls_per_game',
  'possessions_per_game',
  'assist_rate',
  'offensive_rebound_pct',
  'defensive_rebound_pct',
];

console.log('\nCoverage:');
for (const field of STAT_FIELDS) {
  const covered = Object.values(sorted).filter(s => s[field] !== undefined).length;
  console.log(`  ${field.padEnd(26)} ${covered} / ${Object.keys(sorted).length} teams`);
}

// ── Re-run migrate.js ─────────────────────────────────────────────────────────
console.log('\nRunning migrate.js...\n');
try {
  execSync('node migrate.js', { stdio: 'inherit', cwd: __dirname });
} catch (e) {
  console.error('\n[ERROR] migrate.js failed — data/data.json may be stale.');
  process.exit(1);
}

console.log('\nDone. data/data.json and data/teams-data.js are up to date.');
