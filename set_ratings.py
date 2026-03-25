#!/usr/bin/env python3
"""
set_ratings.py — set net_rating on a team in data/teams.json and data/ratings.json

Usage:
    python set_ratings.py <team_id_or_name> <net_rating>

Examples:
    python set_ratings.py arizona 18.4
    python set_ratings.py kansas 22.1
    python set_ratings.py "Michigan State" 9.7

The net_rating value is stored in data/ratings.json (the authoritative source)
and applied to data/teams.json and data/data.json. Ratings in ratings.json
survive future migrate.js runs — the pipeline reads this file on each run.

Typical net_rating range: roughly -30 (weakest) to +35 (elite).
"""

import json
import sys
from pathlib import Path

ROOT          = Path(__file__).parent
TEAMS_FILE    = ROOT / 'data' / 'teams.json'
DATA_FILE     = ROOT / 'data' / 'data.json'
RATINGS_FILE  = ROOT / 'data' / 'ratings.json'

# ── Args ──────────────────────────────────────────────────────────────────────
if len(sys.argv) != 3:
    sys.exit('Usage: python set_ratings.py <team_id_or_name> <net_rating>')

search_key = sys.argv[1].strip()
try:
    new_rating = float(sys.argv[2])
except ValueError:
    sys.exit(f'ERROR: net_rating must be a number, got "{sys.argv[2]}"')

# ── Load teams ────────────────────────────────────────────────────────────────
if not TEAMS_FILE.exists():
    sys.exit(f'ERROR: {TEAMS_FILE} not found — run: node migrate.js')

teams = json.loads(TEAMS_FILE.read_text(encoding='utf-8'))

# ── Find team ─────────────────────────────────────────────────────────────────
key_lower = search_key.lower()
match = next(
    (t for t in teams
     if t['id'].lower() == key_lower or t['name'].lower() == key_lower),
    None
)

if match is None:
    # Partial-name fallback
    candidates = [t for t in teams if key_lower in t['name'].lower()]
    if len(candidates) == 1:
        match = candidates[0]
    elif len(candidates) > 1:
        names = ', '.join(t['name'] for t in candidates)
        sys.exit(f'ERROR: "{search_key}" matches multiple teams: {names}')
    else:
        sys.exit(f'ERROR: No team found matching "{search_key}"')

old_rating = match.get('net_rating')
match['net_rating'] = new_rating

# ── Save teams.json ───────────────────────────────────────────────────────────
TEAMS_FILE.write_text(json.dumps(teams, indent=2), encoding='utf-8')

# ── Update data.json ──────────────────────────────────────────────────────────
if DATA_FILE.exists():
    data = json.loads(DATA_FILE.read_text(encoding='utf-8'))
    for t in data.get('teams', []):
        if t['id'] == match['id']:
            t['net_rating'] = new_rating
            break
    DATA_FILE.write_text(json.dumps(data, indent=2), encoding='utf-8')

# ── Save ratings.json (authoritative, survives migrate.js) ───────────────────
ratings = {}
if RATINGS_FILE.exists():
    try:
        ratings = json.loads(RATINGS_FILE.read_text(encoding='utf-8'))
    except json.JSONDecodeError:
        pass

ratings[match['id']] = new_rating
RATINGS_FILE.write_text(json.dumps(ratings, indent=2, sort_keys=True), encoding='utf-8')

# ── Report ────────────────────────────────────────────────────────────────────
old_str = f'{old_rating:.1f}' if old_rating is not None else 'null'
print(f'  {match["name"]} ({match["conference"]})  {old_str} -> {new_rating:.1f}')

# Print full sorted table
rated = sorted(
    [t for t in teams if t.get('net_rating') is not None],
    key=lambda t: t['net_rating'],
    reverse=True
)
unrated_count = sum(1 for t in teams if t.get('net_rating') is None)

print()
print(f'All teams with net_rating set ({len(rated)} of {len(teams)}, {unrated_count} still null):')
print('-' * 52)
for t in rated:
    print(f'  {t["net_rating"]:>6.1f}  {t["name"]:<28} {t.get("conference", "")}')
