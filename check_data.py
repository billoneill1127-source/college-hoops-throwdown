#!/usr/bin/env python3
"""
check_data.py — College Hoops Throwdown data integrity checker
Usage: python check_data.py

Loads data/teams.json and data/conferences.json and prints a summary report.
Exits 0 if all checks pass, 1 if any FAIL conditions are found.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent
TEAMS_FILE       = ROOT / 'data' / 'teams.json'
CONFERENCES_FILE = ROOT / 'data' / 'conferences.json'
HTML_FILES       = [ROOT / 'index.html', ROOT / 'simulate.html']
INJECT_MARKER    = 'const DATA = ['

HR  = '=' * 60
HR2 = '-' * 60

fails = []

def fail(msg):
    fails.append(msg)
    print(f'  FAIL  {msg}')

def ok(msg):
    print(f'  ok    {msg}')

# ── Load files ────────────────────────────────────────────────────────────────
try:
    teams = json.loads(TEAMS_FILE.read_text(encoding='utf-8'))
except FileNotFoundError:
    sys.exit(f'ERROR: {TEAMS_FILE} not found — run: node migrate.js')
except json.JSONDecodeError as e:
    sys.exit(f'ERROR: {TEAMS_FILE} is not valid JSON: {e}')

try:
    conferences = json.loads(CONFERENCES_FILE.read_text(encoding='utf-8'))
except FileNotFoundError:
    sys.exit(f'ERROR: {CONFERENCES_FILE} not found — run: node migrate.js')
except json.JSONDecodeError as e:
    sys.exit(f'ERROR: {CONFERENCES_FILE} is not valid JSON: {e}')

team_by_id = {t['id']: t for t in teams}

# ── TEAMS SUMMARY ─────────────────────────────────────────────────────────────
print(HR)
print('TEAMS SUMMARY')
print(HR2)

print(f'  Total teams: {len(teams)}')

type_counts = {}
for t in teams:
    k = t.get('type', 'unknown')
    type_counts[k] = type_counts.get(k, 0) + 1
print('  By type:')
for k, n in sorted(type_counts.items()):
    print(f'    {k:<16} {n}')

conf_counts = {}
for t in teams:
    k = t.get('conference', 'unknown')
    conf_counts[k] = conf_counts.get(k, 0) + 1
print('  By conference:')
for k, n in sorted(conf_counts.items()):
    print(f'    {k:<16} {n}')

# ── PLAYER SUMMARY ────────────────────────────────────────────────────────────
print()
print(HR)
print('PLAYER SUMMARY')
print(HR2)

total_players = sum(len(t.get('players', [])) for t in teams)
print(f'  Total players: {total_players}')

thin_teams = []
for t in teams:
    eligible = [
        p for p in t.get('players', [])
        if (p.get('minutes_per_game') or 0) > 0 and p.get('fga_per_100') is not None
    ]
    if len(eligible) < 7:
        thin_teams.append((t['name'], t.get('conference', ''), len(eligible)))

if thin_teams:
    print(f'  Teams with fewer than 7 eligible players (mpg > 0 and fga_per_100 not null):')
    for name, conf, n in sorted(thin_teams):
        print(f'    {name:<28} {conf:<12}  {n} eligible')
else:
    print('  All teams have 7+ eligible players.')

# ── CONFERENCE INTEGRITY ──────────────────────────────────────────────────────
print()
print(HR)
print('CONFERENCE INTEGRITY')
print(HR2)

broken_refs = []
for conf in conferences:
    for mid in conf.get('memberIds', []):
        if mid not in team_by_id:
            broken_refs.append((conf['name'], mid))

if broken_refs:
    for conf_name, mid in broken_refs:
        fail(f'Conference "{conf_name}" memberID "{mid}" has no matching team')
else:
    ok(f'All memberIDs across {len(conferences)} conferences resolve to a team')

# Cross-check: teams whose conference string has no conference object
conf_ids_by_name = {c['name']: c['id'] for c in conferences}
orphan_teams = [t for t in teams if t.get('conference') not in conf_ids_by_name]
if orphan_teams:
    for t in orphan_teams:
        fail(f'Team "{t["name"]}" has conference "{t.get("conference")}" with no conferences.json entry')
else:
    ok(f'All {len(teams)} teams reference a known conference')

# ── NET RATING COVERAGE ───────────────────────────────────────────────────────
print()
print(HR)
print('NET RATING COVERAGE')
print(HR2)

rated_teams   = [t for t in teams if t.get('net_rating') is not None]
unrated_teams = [t for t in teams if t.get('net_rating') is None]

print(f'  Set:  {len(rated_teams)} of {len(teams)} teams')
print(f'  Null: {len(unrated_teams)} teams still need a net_rating')

if unrated_teams:
    print('  Teams without net_rating (run set_ratings.py to fill these in):')
    for t in sorted(unrated_teams, key=lambda t: (t.get('conference', ''), t['name'])):
        print(f'    {t["name"]:<28} {t.get("conference", ""):<12}')

if rated_teams:
    print()
    print('  All teams with net_rating set (sorted descending):')
    for t in sorted(rated_teams, key=lambda t: t['net_rating'], reverse=True):
        print(f'    {t["net_rating"]:>6.1f}  {t["name"]:<28} {t.get("conference", "")}')

# ── DATA INJECTION CHECK ──────────────────────────────────────────────────────
print()
print(HR)
print('DATA INJECTION CHECK')
print(HR2)

for html_path in HTML_FILES:
    if not html_path.exists():
        print(f'  SKIP  {html_path.name} (file not found)')
        continue
    found_at = []
    for i, line in enumerate(html_path.read_text(encoding='utf-8', errors='replace').splitlines(), start=1):
        if INJECT_MARKER in line:
            found_at.append(i)
    if found_at:
        fail(f'{html_path.name}: "{INJECT_MARKER}" found at line(s) {found_at}')
    else:
        ok(f'{html_path.name}: no inline DATA injection found')

# ── RESULT ────────────────────────────────────────────────────────────────────
print()
print(HR)
if fails:
    print(f'RESULT: FAIL  ({len(fails)} issue(s) found)')
    print(HR)
    sys.exit(1)
else:
    print('RESULT: PASS')
    print(HR)
    sys.exit(0)
