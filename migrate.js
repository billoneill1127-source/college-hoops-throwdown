#!/usr/bin/env node
// migrate.js — converts team-data/*.json + import/*_teams.json source files
// into the v2 flat JSON format under /data/
//
// Usage:  node migrate.js
//
// Writes:
//   data/data.json       — primary output: { meta, teams[], conferences[] }
//   data/teams.json      — secondary: flat teams array (no players, for diagnostics)
//   data/players.json    — secondary: flat players array (all, for diagnostics)
//
// Does NOT modify any existing files.

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Paths ─────────────────────────────────────────────────────────────────────
const ROOT          = __dirname;
const TEAM_DATA_DIR = path.join(ROOT, 'import', 'team-data');
const IMPORT_DIR    = path.join(ROOT, 'import');
const DATA_OUT_DIR  = path.join(ROOT, 'data');

const CONF_FILES = [
  { file: 'acc_teams.json',      conference: 'ACC'      },
  { file: 'big_12_teams.json',   conference: 'Big 12'   },
  { file: 'big_east_teams.json', conference: 'Big East' },
  { file: 'big_ten_teams.json',  conference: 'Big Ten'  },  // raw array — normalized below
  { file: 'sec_teams.json',         conference: 'SEC'         },
  { file: 'independent_teams.json', conference: 'Independent' },
];

// Conference metadata: id slug, display names
const CONF_META = {
  'ACC':         { id: 'acc',         shortName: 'ACC'      },
  'Big 12':      { id: 'big_12',      shortName: 'Big 12'   },
  'Big East':    { id: 'big_east',    shortName: 'Big East' },
  'Big Ten':     { id: 'big_ten',     shortName: 'Big Ten'  },
  'SEC':         { id: 'sec',         shortName: 'SEC'      },
  'Independent': { id: 'independent', shortName: 'Ind'      },
};

// The five primary tracked conferences — teams not in this set become 'independent'
const TRACKED_CONFERENCES = new Set(['ACC', 'Big 12', 'Big East', 'Big Ten', 'SEC']);

// ── Stat fields ───────────────────────────────────────────────────────────────
// Used for null-check (all-null exclusion) and stat validation
const STAT_FIELDS = [
  'minutes_per_game', 'ppg', 'rpg', 'apg', 'bpg', 'spg',
  'fga_per_100', 'three_pa_per_100', 'three_point_pct', 'two_point_pct',
  'free_throw_pct', 'offensive_rebounds_per_100', 'defensive_rebounds_per_100',
  'assists_per_100', 'steals_per_100', 'blocks_per_100',
  'turnovers_per_100', 'personal_fouls_per_100',
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function slugifyName(str) {
  return (str || '').toLowerCase().replace(/[^a-z]/g, '');
}

// Returns true if every stat field is null — these players are excluded from output
function isAllNull(p) {
  return STAT_FIELDS.every(f => p[f] == null);
}

// ── Load persisted net_ratings (set via set_ratings.py) ───────────────────────
// Ratings survive migrate.js re-runs; migrate never overwrites with null if a
// value already exists in ratings.json.
const RATINGS_FILE = path.join(DATA_OUT_DIR, 'ratings.json');
let savedRatings = {};  // teamId → net_rating (float)
if (fs.existsSync(RATINGS_FILE)) {
  try {
    savedRatings = JSON.parse(fs.readFileSync(RATINGS_FILE, 'utf8'));
    console.log(`Loaded ratings.json — ${Object.keys(savedRatings).length} net_rating(s) on file.\n`);
  } catch (e) {
    console.warn(`[WARN] Could not parse ratings.json: ${e.message}`);
  }
}

// ── Step 1: Load all team-data files ──────────────────────────────────────────
console.log('Loading team-data files...');
const teamDataMap = {};  // srSlug → raw object

const tdFiles = fs.readdirSync(TEAM_DATA_DIR).filter(f => f.endsWith('.json')).sort();
for (const file of tdFiles) {
  const raw    = JSON.parse(fs.readFileSync(path.join(TEAM_DATA_DIR, file), 'utf8'));
  const srSlug = (raw.srSlug || path.basename(file, '.json')).toLowerCase();
  if (teamDataMap[srSlug]) {
    console.warn(`  [WARN] Duplicate srSlug "${srSlug}" in team-data — "${file}" overwrites previous`);
  }
  teamDataMap[srSlug] = raw;
}
console.log(`  ${tdFiles.length} files loaded.\n`);

// ── Step 2: Load and normalise conference config files ────────────────────────
console.log('Loading conference config files...');
const confTeamMap  = {};  // srSlug → { conference, ...teamMeta }
const confDupCheck = {};

for (const { file, conference } of CONF_FILES) {
  const filePath = path.join(IMPORT_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  [WARN] Config file not found: ${file} — skipping`);
    continue;
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // big_ten_teams.json is a raw array; all others are { conference, teams[] }
  let teams;
  if (Array.isArray(raw)) {
    teams = raw;
  } else {
    teams = raw.teams || [];
    if (raw.conference && raw.conference !== conference) {
      console.warn(`  [WARN] ${file} declares conference "${raw.conference}" but expected "${conference}" — using file value`);
    }
  }

  let matched = 0;
  for (const t of teams) {
    const srSlug = t.srSlug || t.slug;
    if (!srSlug) {
      console.warn(`  [WARN] Team "${t.name}" in ${file} has no srSlug/slug — skipping`);
      continue;
    }
    if (confDupCheck[srSlug]) {
      console.warn(`  [WARN] srSlug "${srSlug}" appears in both ${confDupCheck[srSlug]} and ${file}`);
    }
    confDupCheck[srSlug] = file;
    confTeamMap[srSlug]  = { ...t, conference };
    matched++;
  }
  console.log(`  ${file.padEnd(25)} ${matched} teams  (${conference})`);
}
console.log();

// ── Step 3: Build output arrays ───────────────────────────────────────────────
console.log('Joining data...');
const teamsOut      = [];  // full team objects with embedded players (v2 format)
const teamsFlat     = [];  // team objects without players (diagnostic)
const playersFlat   = [];  // all retained players across all teams (diagnostic)
const usedPlayerIds = new Set();
const idCollisions  = [];
const unmatched     = [];

let totalAllNull = 0;
const allNullByTeam = {};

for (const [srSlug, td] of Object.entries(teamDataMap).sort()) {
  const meta = confTeamMap[srSlug];
  if (!meta) {
    unmatched.push(srSlug);
    continue;
  }

  const rawPlayers = td.players  || [];
  const teamStats  = td.team     || {};

  // Build player objects, excluding all-null players
  const teamPlayers = [];
  for (const p of rawPlayers) {
    if (isAllNull(p)) {
      totalAllNull++;
      (allNullByTeam[srSlug] = allNullByTeam[srSlug] || []).push(p.name);
      continue;
    }

    const nameParts = (p.name || '').trim().split(/\s+/);
    const lastName  = nameParts[nameParts.length - 1] || 'unknown';
    const lastSlug  = slugifyName(lastName);
    const jersey    = (p.number || '0').replace(/\s+/g, '');
    const playerId  = `${srSlug}-${lastSlug}-${jersey}`;

    if (usedPlayerIds.has(playerId)) {
      idCollisions.push({ id: playerId, teamId: srSlug, name: p.name, number: p.number });
    }
    usedPlayerIds.add(playerId);

    const playerObj = {
      id:       playerId,
      teamId:   srSlug,
      number:   p.number   || '',
      name:     p.name     || '',
      position: p.position || '',
      height:   p.height   ?? null,
      weight:   p.weight   ?? null,
      class:    p.class    || '',
      minutes_per_game:           p.minutes_per_game           ?? null,
      ppg:                        p.ppg                        ?? null,
      rpg:                        p.rpg                        ?? null,
      apg:                        p.apg                        ?? null,
      bpg:                        p.bpg                        ?? null,
      spg:                        p.spg                        ?? null,
      fga_per_100:                p.fga_per_100                ?? null,
      three_pa_per_100:           p.three_pa_per_100           ?? null,
      three_point_pct:            p.three_point_pct            ?? null,
      two_point_pct:              p.two_point_pct              ?? null,
      free_throw_pct:             p.free_throw_pct             ?? null,
      offensive_rebounds_per_100: p.offensive_rebounds_per_100 ?? null,
      defensive_rebounds_per_100: p.defensive_rebounds_per_100 ?? null,
      assists_per_100:            p.assists_per_100            ?? null,
      steals_per_100:             p.steals_per_100             ?? null,
      blocks_per_100:             p.blocks_per_100             ?? null,
      turnovers_per_100:          p.turnovers_per_100          ?? null,
      personal_fouls_per_100:     p.personal_fouls_per_100     ?? null,
    };

    teamPlayers.push(playerObj);
    playersFlat.push(playerObj);
  }

  const teamObj = {
    id:                    srSlug,
    name:                  meta.name,
    nickname:              meta.nickname              || '',
    conference:            TRACKED_CONFERENCES.has(meta.conference) ? meta.conference : 'Independent',
    type:                  TRACKED_CONFERENCES.has(meta.conference) ? 'real' : 'independent',
    city:                  meta.city                  || '',
    primaryColor:          meta.primaryColor          || '',
    head_coach:            teamStats.head_coach        || '',
    net_rating:            savedRatings[srSlug] ?? null,
    possessions_per_game:  teamStats.possessions_per_game  || 70,
    offensive_rebound_pct: teamStats.offensive_rebound_pct || 0.28,
    defensive_rebound_pct: teamStats.defensive_rebound_pct || 0.72,
    assist_rate:           teamStats.assist_rate           || 0.54,
    team_fouls_per_game:   teamStats.team_fouls_per_game   || 18,
    home_fg_bonus:         teamStats.home_fg_bonus         || 0.02,
    players:               teamPlayers,
  };

  teamsOut.push(teamObj);
  teamsFlat.push({ ...teamObj, players: undefined });
}

console.log(`  Joined ${teamsOut.length} teams, ${playersFlat.length} players retained (${totalAllNull} all-null excluded).\n`);

// ── Step 4: Build conferences lookup ──────────────────────────────────────────
const conferencesOut = [];
const confMemberMap  = {};  // confName → [teamIds]

for (const t of teamsOut) {
  (confMemberMap[t.conference] = confMemberMap[t.conference] || []).push(t.id);
}

for (const [confName, memberIds] of Object.entries(confMemberMap).sort()) {
  const cm = CONF_META[confName] || { id: confName.toLowerCase().replace(/\s+/g, '_'), shortName: confName };
  conferencesOut.push({
    id:        cm.id,
    name:      confName,
    shortName: cm.shortName,
    memberIds: memberIds.sort(),
  });
}

// ── Step 5: Assemble and write output files ───────────────────────────────────
if (!fs.existsSync(DATA_OUT_DIR)) fs.mkdirSync(DATA_OUT_DIR);

const today = new Date().toISOString().slice(0, 10);

const v2Data = {
  meta: {
    version:   '2.0',
    season:    '2025-26',
    generated: today,
  },
  conferences: conferencesOut,
  teams:       teamsOut,
};

fs.writeFileSync(path.join(DATA_OUT_DIR, 'data.json'),
  JSON.stringify(v2Data, null, 2), 'utf8');

// teams.json — full teams array with embedded players (primary queryable file)
fs.writeFileSync(path.join(DATA_OUT_DIR, 'teams.json'),
  JSON.stringify(teamsOut, null, 2), 'utf8');

// conferences.json — lookup table only, no player/team data embedded
fs.writeFileSync(path.join(DATA_OUT_DIR, 'conferences.json'),
  JSON.stringify(conferencesOut, null, 2), 'utf8');

// players.json — flat array of all retained players (diagnostics)
fs.writeFileSync(path.join(DATA_OUT_DIR, 'players.json'),
  JSON.stringify(playersFlat, null, 2), 'utf8');

// ── Step 6: Validation report ─────────────────────────────────────────────────
const hr  = '═'.repeat(60);
const hr2 = '─'.repeat(60);

console.log(hr);
console.log('MIGRATION VALIDATION REPORT  (v2)');
console.log(hr);

// Teams by conference
console.log('\nTEAMS BY CONFERENCE');
console.log(hr2);
for (const c of conferencesOut) {
  console.log(`  ${c.name.padEnd(12)}  ${c.memberIds.length} teams`);
}
console.log(`  ${'TOTAL'.padEnd(12)}  ${teamsOut.length} teams`);

// Player stats
console.log('\nPLAYER COUNTS');
console.log(hr2);
let cFull = 0, cPartial = 0;
for (const p of playersFlat) {
  const nulls = STAT_FIELDS.filter(f => p[f] == null).length;
  if (nulls === 0) cFull++;
  else             cPartial++;
}
console.log(`  Retained (full stats):   ${cFull}`);
console.log(`  Retained (partial-null): ${cPartial}`);
console.log(`  Excluded (all-null):     ${totalAllNull}`);
console.log(`  Total retained:          ${playersFlat.length}`);

if (totalAllNull > 0) {
  console.log('\nEXCLUDED ALL-NULL PLAYERS BY TEAM');
  console.log(hr2);
  for (const [teamId, names] of Object.entries(allNullByTeam).sort()) {
    console.log(`  ${teamId.padEnd(26)} ${names.join(', ')}`);
  }
}

// net_rating coverage
const rated   = teamsOut.filter(t => t.net_rating !== null);
const unrated = teamsOut.filter(t => t.net_rating === null);
console.log('\nNET RATING COVERAGE');
console.log(hr2);
console.log(`  Set:   ${rated.length}`);
console.log(`  Null:  ${unrated.length}`);
if (rated.length > 0) {
  console.log('\nTEAMS BY NET RATING (descending)');
  console.log(hr2);
  for (const t of rated.slice().sort((a, b) => b.net_rating - a.net_rating)) {
    console.log(`  ${String(t.net_rating).padStart(6)}  ${t.name.padEnd(24)} ${t.conference}`);
  }
}
if (unrated.length > 0) {
  console.log('\nTEAMS WITHOUT NET RATING');
  console.log(hr2);
  for (const t of unrated.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`  ${t.name.padEnd(28)} ${t.conference}`);
  }
}

// ID collisions
console.log('\nPLAYER ID COLLISIONS');
console.log(hr2);
if (idCollisions.length === 0) {
  console.log('  None detected.');
} else {
  for (const c of idCollisions) {
    console.log(`  COLLISION  ${c.id}  (${c.name}, #${c.number}, team: ${c.teamId})`);
  }
}

// Unmatched team-data files
console.log('\nUNMATCHED TEAM-DATA FILES (no conference config entry)');
console.log(hr2);
if (unmatched.length === 0) {
  console.log('  None.');
} else {
  for (const s of unmatched.sort()) console.log(`  ${s}`);
}

// Config teams with no team-data file
console.log('\nCONFIG TEAMS WITH NO TEAM-DATA FILE');
console.log(hr2);
const missingTD = Object.entries(confTeamMap)
  .filter(([slug]) => !teamDataMap[slug])
  .map(([slug, meta]) => ({ slug, name: meta.name, conference: meta.conference }))
  .sort((a, b) => a.conference.localeCompare(b.conference) || a.name.localeCompare(b.name));
if (missingTD.length === 0) {
  console.log('  None.');
} else {
  for (const t of missingTD) {
    console.log(`  ${t.slug.padEnd(28)} ${t.name.padEnd(24)} (${t.conference})`);
  }
}

console.log('\nOUTPUT FILES WRITTEN');
console.log(hr2);
console.log(`  data/data.json       v2 combined file (meta + ${conferencesOut.length} conferences + ${teamsOut.length} teams)`);
console.log(`  data/teams.json      ${teamsOut.length} teams with embedded players`);
console.log(`  data/conferences.json  ${conferencesOut.length} conferences (lookup table)`);
console.log(`  data/players.json    ${playersFlat.length} players (flat, diagnostics)`);
console.log(`\n  net_rating: set manually via set_ratings.py — stored in data/ratings.json`);

console.log('\n' + hr);
console.log('Migration complete.');
console.log(hr + '\n');
