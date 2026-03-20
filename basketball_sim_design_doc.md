# College Basketball Simulation Game — Full Design Document
**Tech Stack: React/JS (Web App)**
**Last Updated: 2026**

---

## Table of Contents
1. Data Model & What You Still Need
2. Game Structure & Clock
3. Possession Resolution Logic
4. Rebound System (Medium Granularity)
5. Strategy System
6. Momentum System
7. Play-by-Play Narration System
8. Scoreboard UI Spec
9. Open Questions / V2 Candidates

---

## 1. Data Model & What You Still Need

### 1a. What You Currently Have (Player Table)

Your player table already contains the core simulation fields:

```
Player {
  player_id
  team_id
  name
  position                    // "G" | "F" | "C"

  // Shooting percentages
  two_point_pct               // 2P%
  three_point_pct             // 3P%
  free_throw_pct              // FT% (reserved for v2)

  // Per-100-possession stats
  fga_per_100                 // field goal attempts
  three_pa_per_100            // three-point attempts
  turnovers_per_100           // all turnovers (includes steals against)
  steals_per_100              // steals made on defense
  rebounds_per_100            // total rebounds (offensive + defensive combined)
}
```

**One derived field to compute at load time (not stored, calculated in JS):**
```javascript
player.three_pa_rate = player.three_pa_per_100 / player.fga_per_100;
// This is the % of that player's shots that are 3-pointers
```

**One clarification needed on your REB field:**
If your `rebounds_per_100` is total rebounds, you'll need to split it or add separate
`offensive_rebounds_per_100` and `defensive_rebounds_per_100` fields. The rebound
system (Section 4) assigns individual rebounders by position weight, so the split
matters. If you can only get total rebounds, use a fixed position-based split:
  - Guards:   25% offensive, 75% defensive of their total
  - Forwards: 40% offensive, 60% defensive
  - Centers:  45% offensive, 55% defensive

---

### 1b. What You Still Need to Add

#### NEW TABLE: Team

Add this before populating more player data — it is small (one row per team) and
several simulation mechanics depend on it.

```
Team {
  team_id                     // matches team_id in Player table
  name                        // e.g. "Michigan Bulldogs"
  abbreviation                // e.g. "MICH"
  conference                  // e.g. "Big Ten"
  is_home                     // boolean, set at game creation time

  // Pace — REQUIRED for converting per-100 stats to per-possession probabilities
  possessions_per_game        // e.g. 72.4 — source: KenPom, Bart Torvik, or ESPN

  // Rebound rates — REQUIRED for rebound outcome resolution
  offensive_rebound_pct       // % of own missed shots recovered offensively, e.g. 0.27
  defensive_rebound_pct       // % of opponent misses recovered defensively, e.g. 0.73
  // Note: off_reb_pct + def_reb_pct of OPPONENT should sum to 1.0

  // Home court
  home_fg_bonus               // additive FG% boost when playing at home, e.g. 0.018
  // If you can't source this, use a flat 0.02 for all teams
}
```

**Where to get `possessions_per_game`:**
Bart Torvik (barttorvik.com) and KenPom both publish adjusted tempo. Use the raw
possessions per game figure, not the adjusted one. A reasonable default if missing: 70.

**Where to get `offensive_rebound_pct` / `defensive_rebound_pct`:**
These are widely published as "ORB%" and "DRB%" on Sports Reference (sports-reference.com),
Torvik, or KenPom. ORB% is typically 25–32% for most teams. If missing, use 0.28 / 0.72.

---

#### NEW TABLE: Game (created at game start, not pre-populated)

```
Game {
  game_id
  home_team_id
  away_team_id
  created_at

  // Runtime state (stored in React state, not necessarily persisted)
  current_half               // 1 | 2 | "OT"
  clock_seconds              // remaining seconds in current half
  home_score
  away_score
  possession_team_id         // which team currently has the ball
  momentum_home              // integer -5 to +5
  momentum_away
  home_strategy_offense      // "balanced" | "inside-out" | "perimeter" | "spread-drive"
  home_strategy_defense      // "man" | "pack-paint" | "pressure" | "zone"
  away_strategy_offense
  away_strategy_defense
  next_timeout_trigger       // 16 | 12 | 8 | 4 | null — next media timeout threshold
}
```

---

#### NEW TABLE: GameEvent (play-by-play log)

```
GameEvent {
  event_id                   // auto-increment
  game_id
  half                       // 1 | 2 | "OT"
  clock_seconds              // clock at time of event
  event_type                 // "made_2" | "made_3" | "miss" | "steal" | "turnover" |
                             //  "off_rebound" | "def_rebound" | "milestone" | "timeout"
  primary_player_id          // shooter, stealer, rebounder, etc.
  secondary_player_id        // defender on steal, etc. (nullable)
  team_id                    // team the event belongs to
  points_scored              // 0, 2, or 3
  home_score_after           // score after event resolves
  away_score_after
  narration_text             // the generated play-by-play string shown to user
}
```

---

#### PLAYER TABLE: One field to add

```
minutes_per_game             // used to rank starters vs. bench; top 5 = starting lineup
```

If minutes aren't available, you can use `fga_per_100` as a proxy for playing time —
higher usage generally correlates with more minutes. Not ideal but functional for v1.

---

## 2. Game Structure & Clock

**Format:** Two 20-minute halves (1200 seconds each). 5-minute OT (300 seconds) if tied.
Repeat OT until a winner.

**Clock is decremented after each possession resolves**, not during it. This keeps
the simulation clean and deterministic.

### Clock Cost Per Possession Type

| Possession Outcome | Seconds Deducted |
|---|---|
| Shot attempt (made or missed) | 17 seconds |
| Turnover (non-steal) | 10 seconds |
| Steal | 10 seconds |
| Offensive rebound continuation | 8 seconds (replaces the 17s for that trip) |

> **Source note:** 17 seconds is the approximate average seconds-per-possession in
> 2024–25 men's college basketball (roughly 70 possessions in a 40-minute game).
> Use 20 if you want a more conservative figure.

### End-of-Half Logic

Before starting each possession, check:
```javascript
if (game.clock_seconds <= 0) {
  endHalf();
  return;
}
// Allow possession to proceed; deduct time after resolution
// If clock goes negative, set to 0 — do not allow additional possessions
```

### Media Timeouts (Application-Controlled)

Timeouts trigger automatically after the first dead ball (possession end) when the
clock crosses under 16:00, 12:00, 8:00, and 4:00 in each half. Track with a simple
threshold queue:

```javascript
const TIMEOUT_THRESHOLDS = [960, 720, 480, 240]; // seconds (16, 12, 8, 4 min)

function checkMediaTimeout(clockBefore, clockAfter) {
  for (const threshold of TIMEOUT_THRESHOLDS) {
    if (clockBefore > threshold && clockAfter <= threshold) {
      triggerMediaTimeout();
      // Remove this threshold so it doesn't fire again
    }
  }
}
```

At each media timeout, show the Strategy Adjustment Screen (Section 5) and pause
simulation until user confirms.

---

## 3. Possession Resolution Logic

Run these steps in order. **First condition that fires ends the possession.**

### Setup: Per-Possession Conversion

All player stats are per 100 possessions. Convert to per-possession probability:

```javascript
function perPossessionChance(statPer100, teamPossessionsPerGame) {
  // Scale player's rate by the team's actual pace
  // A player on a fast team (80 poss/game) gets more chances than on a slow team (65)
  return (statPer100 / 100) * (teamPossessionsPerGame / 70);
  // 70 is the approximate NCAA average pace; adjust if you have a better figure
}
```

> **Design note:** This scaling step is important. Without it, players on fast-tempo
> teams would have the same per-possession rates as players on slow teams, even though
> fast-tempo teams create more raw opportunities.

---

### Step 1 — Defensive Steal Check

Iterate over all 5 defenders. For each:

```javascript
const stealChance = perPossessionChance(
  defender.steals_per_100,
  defendingTeam.possessions_per_game
);
// Apply pressure defense modifier if active (×1.3)
const adjustedStealChance = stealChance * strategyMultiplier;

if (Math.random() < adjustedStealChance) {
  // STEAL — possession switches, clock -10s
  resolveSteal(defender, ballHandler);
  return;
}
```

Check all 5 defenders before moving on. If multiple defenders "fire" in the same roll
(unlikely but possible), take only the first one (iterate in a fixed order).

---

### Step 2 — Offensive Turnover Check

Iterate over all 5 offensive players. For each:

```javascript
const rawToChance = perPossessionChance(
  offensivePlayer.turnovers_per_100,
  offensiveTeam.possessions_per_game
);
// Steals are already counted in turnovers; reduce to avoid double-counting
// Approximately 45% of turnovers are steals nationally, so non-steal TO = 55%
const nonStealToChance = rawToChance * 0.55;
// Apply pressure defense modifier if active (×1.2)
const adjustedToChance = nonStealToChance * strategyMultiplier;

if (Math.random() < adjustedToChance) {
  // TURNOVER — possession switches, clock -10s
  resolveTurnover(offensivePlayer);
  return;
}
```

---

### Step 3 — Determine Shooter

Build a weighted array of the 5 offensive players using `fga_per_100` as weights.
Apply strategy modifiers to the weights before drawing (see Section 5).

```javascript
function selectShooter(offensivePlayers, offenseStrategy) {
  const weights = offensivePlayers.map(p => {
    let w = p.fga_per_100;
    // Inside-Out: boost C/F weight by 30%
    if (offenseStrategy === 'inside-out' && ['F','C'].includes(p.position)) w *= 1.3;
    // Perimeter: boost G weight by 20%
    if (offenseStrategy === 'perimeter' && p.position === 'G') w *= 1.2;
    return w;
  });
  return weightedRandom(offensivePlayers, weights);
}

function weightedRandom(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1]; // fallback
}
```

---

### Step 4 — Shot Type: Two or Three?

```javascript
const threePaRate = shooter.three_pa_per_100 / shooter.fga_per_100;

// Strategy modifiers
let adjustedRate = threePaRate;
if (offenseStrategy === 'perimeter')   adjustedRate += 0.06;
if (offenseStrategy === 'inside-out')  adjustedRate -= 0.05;
if (offenseStrategy === 'spread-drive') adjustedRate -= 0.03;
if (defenseStrategy === 'zone')        adjustedRate -= 0.03; // zone suppresses threes
if (defenseStrategy === 'pack-paint')  adjustedRate += 0.04; // forces perimeter looks

adjustedRate = Math.max(0, Math.min(1, adjustedRate)); // clamp 0–1

const isThree = Math.random() < adjustedRate;
```

---

### Step 5 — Shot Outcome

```javascript
const basePct = isThree ? shooter.three_point_pct : shooter.two_point_pct;

let adjustedPct = basePct;

// Home court
if (shooterTeam.is_home) adjustedPct += shooterTeam.home_fg_bonus; // e.g. +0.02

// Offensive strategy
if (offenseStrategy === 'spread-drive' && !isThree) adjustedPct += 0.02;

// Defensive strategy
if (defenseStrategy === 'pack-paint' && !isThree)  adjustedPct -= 0.04;
if (defenseStrategy === 'pack-paint' && isThree)   adjustedPct += 0.01;
if (defenseStrategy === 'zone' && isThree)         adjustedPct -= 0.03;
if (defenseStrategy === 'zone' && !isThree)        adjustedPct += 0.01;

// Momentum (see Section 6)
adjustedPct += getMomentumModifier(shooterTeam);

adjustedPct = Math.max(0.05, Math.min(0.95, adjustedPct)); // clamp — no one shoots 0% or 100%

const shotMade = Math.random() < adjustedPct;
```

---

### Step 6 — Made Basket

```javascript
if (shotMade) {
  const points = isThree ? 3 : 2;
  incrementScore(shooterTeam, points);
  decrementClock(17);
  updateMomentum(shooterTeam, isThree ? 2 : 1);
  switchPossession();
  checkMilestones(shooter, points);
  logEvent('made_' + points, shooter);
  return;
}
```

---

### Step 7 — Missed Shot → Rebound

```javascript
// Clock already elapsed on the shot attempt
decrementClock(17);
resolveRebound(offensiveTeam, defensiveTeam, shooter);
// resolveRebound sets next possession team (see Section 4)
// and decrements additional 8s clock if offensive rebound
```

---

## 4. Rebound System (Medium Granularity)

The rebound system has two stages: **outcome** (which team gets it) then
**assignment** (which player on that team gets credit).

### Stage 1 — Outcome: Which Team?

```javascript
function resolveRebound(offTeam, defTeam, shooter) {
  const offRebPct = offTeam.offensive_rebound_pct; // e.g. 0.28

  if (Math.random() < offRebPct) {
    // Offensive rebound
    const rebounder = assignRebounder(offTeam.activePlayers, 'offensive');
    logEvent('off_rebound', rebounder);
    // Possession STAYS with offensive team; shorter clock cost
    decrementClock(8);
    updateMomentum(offTeam, 1);
    // Do NOT switch possession — next possession loop iteration continues with same team
    setOffensiveReboundFlag(true); // used to skip steal/TO checks on next trip (optional v2)
  } else {
    // Defensive rebound
    const rebounder = assignRebounder(defTeam.activePlayers, 'defensive');
    logEvent('def_rebound', rebounder);
    switchPossession();
    // Clock already decremented by the shot; no additional deduction here
  }
}
```

> **Note on `setOffensiveReboundFlag`:** After an offensive rebound, you may optionally
> skip the steal/turnover checks on the immediately following possession to avoid
> unrealistically high turnover rates on tip-ins. This is a v2 refinement — in v1,
> running the full possession logic is acceptable.

---

### Stage 2 — Assignment: Which Player Gets Credit?

Position-based weights determine who on the rebounding team is credited. These weights
reflect the physical realities of basketball — bigs crash the boards more.

```javascript
const POSITION_REBOUND_WEIGHTS = {
  offensive: { G: 1.0, F: 2.5, C: 3.5 },
  defensive: { G: 1.2, F: 2.5, C: 3.2 }
};
// Guards slightly better at defensive rebounds due to boxing out guards on the perimeter

function assignRebounder(players, reboundType) {
  const weights = players.map(p =>
    POSITION_REBOUND_WEIGHTS[reboundType][p.position] || 1.0
  );
  return weightedRandom(players, weights);
}
```

**Why position weights instead of individual rebound stats?**
You have `rebounds_per_100` in your player table, which you *could* use directly as
weights. The advantage is higher accuracy. The risk is that if a team's guards happen
to have high rebound rates in the data (due to small sample, wrong position tag, etc.),
it can produce unrealistic assignments. Position weights are more robust for simulation
purposes.

**Optional upgrade path:** Once you're confident in your data quality, replace the
position weights with individual player weights:

```javascript
// Future upgrade — use actual player rebound rates as weights
const weights = players.map(p =>
  reboundType === 'offensive'
    ? (p.offensive_rebounds_per_100 || 1.0)
    : (p.defensive_rebounds_per_100 || 1.0)
);
```

---

## 5. Strategy System

Strategies are selected by the user at tip-off and can be changed at each media
timeout. Store as string enums on the Game object.

### Offensive Strategies

| ID | Label | Effect |
|---|---|---|
| `balanced` | Balanced | No modifiers (default) |
| `inside-out` | Inside-Out | +30% FGA weight for F/C; 3PA rate −0.05 |
| `perimeter` | Perimeter Attack | +20% FGA weight for G; 3PA rate +0.06; 2P% −0.01 |
| `spread-drive` | Spread & Drive | 3PA rate −0.03; 2P% +0.02 |

### Defensive Strategies

| ID | Label | Effect |
|---|---|---|
| `man` | Man-to-Man | No modifiers (default) |
| `pack-paint` | Pack the Paint | Opponent 2P% −0.04; opponent 3P% +0.01; opponent 3PA rate +0.04 |
| `pressure` | Full-Court Pressure | Steal chance ×1.3; opponent TO chance ×1.2 |
| `zone` | Zone Defense | Opponent 3P% −0.03; opponent 2P% +0.01; opponent 3PA rate −0.03 |

---

## 6. Momentum System

Momentum is tracked per team as an integer from −5 to +5.
Initialize both teams at 0 at game start. Reset to 0 at halftime.

### Momentum Changes

| Event | Change |
|---|---|
| Made basket (2pt) | Shooting team +1 |
| Made basket (3pt) | Shooting team +2 |
| Steal | Stealing team +2 |
| Offensive rebound | Offensive team +1 |
| Turnover (non-steal) | No momentum change |
| 3+ consecutive scores (run) | Additional +1 per make beyond the 2nd |

### Momentum Modifier on FG%

```javascript
function getMomentumModifier(team) {
  return team.momentum * 0.004;
  // Range: -0.02 to +0.02 on FG%
  // Subtle but meaningful over a full game
}
```

### Momentum Decay

After every possession that produces no scoring event (missed shot, rebound, turnover),
apply decay:

```javascript
function decayMomentum(team) {
  if (team.momentum > 0) team.momentum = Math.max(0, team.momentum - 1);
  if (team.momentum < 0) team.momentum = Math.min(0, team.momentum + 1);
}
// Decay toward zero, one step at a time, on every non-scoring possession
```

### Run Detection (for narration and momentum)

Track consecutive made baskets per team. Reset to 0 on any defensive stop.

```javascript
// On made basket:
team.currentRun++;
opponent.currentRun = 0;

// Trigger run narration at:
// 4-0 run, 6-0 run, 8-0 run, 10-0 run, 12-0 run
// Check after each make: if (team.currentRun % 2 === 0 && team.currentRun >= 4)
```

---

## 7. Play-by-Play Narration System

**Architecture:** Templates handle routine possessions (fast, deterministic, varied).
Claude API calls handle milestone moments (slower but richer, used sparingly).

---

### 7a. Template Engine (Routine Plays)

Each event type has a pool of template strings. Pick randomly from the pool each time.
Use `{player}`, `{team}`, `{opponent}`, `{score}`, `{points}` as substitution tokens.

**Made 2-pointer (15+ templates, sample):**
```
"{player} drives baseline and finishes — {team} lead {score}!"
"{player} with the mid-range pull-up. Good. {score}."
"{player} catches and shoots from the elbow — that's two! {score}"
"{player} bullies his way inside for the bucket. {score}."
"{player} off the glass — count it! {score}"
"Pretty feed inside, {player} lays it up and in. {score}"
"{player} pump fakes, draws contact — gets the bucket! {score}"
"{player} to the rim and finishes strong. {team} up {score}."
"Off the screen, {player} finds daylight — yes! {score}"
```

**Made 3-pointer (15+ templates, sample):**
```
"{player} steps back and buries the three! {team} {score}!"
"From way downtown — {player} with the triple! {score}"
"{player} catch-and-shoot from the corner — GOOD! {score}"
"{player} pulls up from deep — it's good! {score}."
"Ball swings to {player} — he's open — BANG! Three! {score}"
"{player} off the dribble from the arc — rattles in! {score}"
"Corner three by {player} — no hesitation, all net. {score}"
"{player} with a step-back dagger! {team} extends the lead — {score}!"
```

**Missed shot (10+ templates, sample):**
```
"{player} pulls up from the elbow — off the back iron, no good."
"{player} drives, lays it up — blocked out by the defense. Miss."
"{player} fires from three — it's short, no good."
"Forced look by {player} — misses badly. {opponent} ball."
"{player} with the runner in the lane — it rolls off. Miss."
"Off-balance shot by {player} — not close. {opponent} looking to push."
```

**Steal (8+ templates, sample):**
```
"{player} picks the pocket of {opponent_player} — {team} with the steal!"
"{player} jumping the passing lane — got it! Turnover {opponent}!"
"Deflected! {player} with the steal — {team} in transition!"
"{player} with quick hands — strips {opponent_player}, {team} ball!"
```

**Non-steal turnover (8+ templates, sample):**
```
"{player} loses the handle — ball out of bounds, {opponent} ball."
"Errant pass by {player} — turnover, {team} gives it away."
"Charging foul on {player}! Turnover, {opponent} takes over."
"{player} telegraphs the pass — it's picked off by {opponent}."
"Double dribble called on {player} — sloppy execution by {team}."
"{player} with a bad entry pass — right to the defender. Turnover."
```

**Offensive rebound (6+ templates, sample):**
```
"{player} crashes the glass and keeps it alive for {team}!"
"Second chance for {team} — {player} with the offensive board!"
"{player} tip-up — he's still alive in there! {team} keeps the possession."
"Off the back iron, {player} snags it — {team} gets another look!"
```

**Defensive rebound (6+ templates, sample):**
```
"{player} with the long rebound — {team} pushing in transition."
"{player} boxes out and corrals it — {team} ball."
"Defensive glass by {player}. {team} looking to go the other way."
"{player} with the board — clears the lane, {team} in control."
```

---

### 7b. Claude API Calls (Milestone & Special Moments)

Use the Anthropic API for these specific triggers only. This keeps API costs low while
making the big moments feel genuinely special.

**Triggers for API narration:**

| Trigger | Condition |
|---|---|
| Scoring milestone | Player reaches 10, 15, 20, 25, 30 points |
| Rebound milestone | Player reaches 10 rebounds (double-double trigger) |
| Assist milestone | Player reaches 8 assists |
| Big run | Team completes a 10-0, 12-0, or greater run |
| Comeback | Team erases a 10+ point deficit to tie or take the lead |
| Clutch score | Made basket in final 2 minutes when game within 3 points |
| Half-buzzer | Score in final 5 seconds of a half |
| Overtime start | Game goes to OT |

**API call structure:**

```javascript
async function generateMilestoneNarration(context) {
  const prompt = buildMilestonePrompt(context);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      messages: [{ role: "user", content: prompt }]
    })
  });

  const data = await response.json();
  return data.content[0].text.trim();
}
```

**Prompt template for milestone narration:**

```javascript
function buildMilestonePrompt(ctx) {
  return `You are a college basketball play-by-play announcer. 
Write ONE sentence of exciting, colorful play-by-play commentary for this moment.
Do not include math, percentages, or statistics in raw form.
Do not use quotation marks. Keep it under 25 words.

Situation:
- Player: ${ctx.playerName} (${ctx.teamName})
- Milestone: ${ctx.milestoneDescription}
- Current score: ${ctx.homeTeam} ${ctx.homeScore}, ${ctx.awayTeam} ${ctx.awayScore}
- Time remaining: ${ctx.timeRemaining} in the ${ctx.half}
- Momentum note: ${ctx.momentumNote}

Examples of the right tone:
  Wagler has reached 20 points tonight and this crowd is electric!
  Johnson owns the glass — his tenth rebound gives the Bulldogs life!
  That's a ten-nothing run and the comeback is ON for the Tigers!`;
}
```

**Cache/deduplicate:** Don't call the API twice for the same milestone in the same
game. Track which milestones have been called in the Game state object.

---

### 7c. Milestone Detection Logic

Run this after every scoring event resolves:

```javascript
function checkMilestones(player, pointsScored, gameState) {
  // Update player's game totals
  player.gamePts += pointsScored;
  player.gameReb += 0; // updated separately in rebound resolution
  player.gameAst += 0; // reserved for v2

  const milestones = [];

  // Points milestones
  const ptThresholds = [10, 15, 20, 25, 30];
  for (const threshold of ptThresholds) {
    if (player.gamePts >= threshold && player.gamePts - pointsScored < threshold) {
      milestones.push({
        type: 'points',
        playerName: player.name,
        teamName: player.team.name,
        milestoneDescription: `scored his ${threshold}th point of the game`
      });
    }
  }

  // Run detection
  const runLength = player.team.currentRun;
  if ([8, 10, 12].includes(runLength)) {
    milestones.push({
      type: 'run',
      playerName: null,
      teamName: player.team.name,
      milestoneDescription: `gone on a ${runLength}-0 run`
    });
  }

  return milestones; // caller decides whether to fire API or use template
}
```

---

### 7d. Score Display in Narration

Always append current score to made-basket narration. Format:

- If shooting team is winning: `"{team} lead {home_score}–{away_score}!"`
- If shooting team is trailing: `"cuts the lead to {margin} — {home_score}–{away_score}"`
- If tied: `"ties it up at {score}!"`

Compute this before building the narration string so the template token `{score}` is
already formatted correctly.

---

## 8. Scoreboard UI Spec

```
┌─────────────────────────────────────────────────────────┐
│  MICHIGAN               H1  12:34          OHIO STATE   │
│     45                                         38       │
│                                                         │
│  Player       Pts  Reb  │  Player       Pts  Reb        │
│  ──────────────────────  ──────────────────────────     │
│  Johnson       14    6  │  Harris        11    4        │
│  Wagler         8    2  │  Smith          9    7        │
│  Williams       6    3  │  Carter         6    2        │
│  Davis          5    1  │  Thompson       5    5        │
│  Parker         4    4  │  Rivera         7    1        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ PLAY BY PLAY                                            │
│ 12:34  Johnson hits the mid-range — Michigan lead 45–38!│
│ 12:51  Parker with the steal! Michigan in transition.   │
│ 13:08  Harris misses the three. Williams with the board.│
│ 13:25  Wagler has 20 points tonight! What a game!       │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

- Play-by-play scrolls, newest at top
- Milestone lines are visually distinct (bold or highlighted)
- Clock format: M:SS
- Score updates animate briefly on change (CSS transition)
- Momentum indicator optional: small arrow or bar between scores

---

## 9. Open Questions / V2 Candidates

| Feature | Notes |
|---|---|
| Free throws | Triggered by foul rate (team-level stat). Would need `fouls_per_100` and `ft_rate` added to team table. |
| User-called timeouts | 3 per half; same Strategy UI as media timeouts. |
| Substitutions | Could auto-sub on momentum swings or foul trouble. |
| Fatigue | Reduce FG% by small amount in second half for players with high `minutes_per_game`. |
| Assists | Track which player passed on made baskets; requires shot-passer selection logic. |
| Fouls | Team foul tracking → bonus free throws after 7th team foul. |
| Multiple seasons | Extend data model with a `season` field on Team and Player. |

---

## Appendix: Data Population Priority Order

Given that populating data is time-consuming, add fields in this order:

1. **`minutes_per_game` on Player** — needed for lineup selection
2. **Team table with `possessions_per_game`** — needed to convert any stat to per-possession
3. **Team table with `offensive_rebound_pct`** — needed for rebound system
4. **Team table with `home_fg_bonus`** — can default to 0.02 until sourced
5. **Player `offensive_rebounds_per_100` / `defensive_rebounds_per_100`** — only if upgrading rebound system beyond position weights
