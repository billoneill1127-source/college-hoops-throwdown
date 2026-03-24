import sys

path = r"C:/Users/oneil/Desktop/college-hoops-throwdown/simulate.html"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. Controls ──────────────────────────────────────────────────────────────
old_ctrl = (
    '  <button onclick="runSim()">Run Simulation</button>\n'
    '  <button onclick="runSim()">Re-run</button>\n'
    '</div>\n'
    '<div id="output"></div>'
)
new_ctrl = (
    '  <label style="color:#8b949e;font-size:0.85em;">GAMES\n'
    '    <select id="numGames" style="margin-left:8px;background:#161b22;color:#e6edf3;border:1px solid #30363d;padding:6px 10px;font-family:inherit;font-size:0.9em;border-radius:4px;">\n'
    '      <option value="1">1</option>\n'
    '      <option value="10">10</option>\n'
    '      <option value="25" selected>25</option>\n'
    '      <option value="50">50</option>\n'
    '      <option value="100">100</option>\n'
    '    </select>\n'
    '  </label>\n'
    '  <button onclick="runSim()">Run Simulation</button>\n'
    '</div>\n'
    '<div id="output"></div>'
)
if old_ctrl not in content:
    print("ERROR: controls not found"); sys.exit(1)
content = content.replace(old_ctrl, new_ctrl, 1)
print("controls OK")

# ── 2. runSim + all display functions ───────────────────────────────────────
# Find the start of runSim and replace everything from there to end of script
marker = "function runSim() {"
idx = content.find(marker)
if idx < 0:
    print("ERROR: runSim not found"); sys.exit(1)

# Find the closing </script> tag
end_marker = "</script>\n</body>\n</html>"
end_idx = content.find(end_marker)
if end_idx < 0:
    end_marker = "</script>\r\n</body>\r\n</html>"
    end_idx = content.find(end_marker)
if end_idx < 0:
    print("ERROR: end marker not found"); sys.exit(1)

new_tail = r"""function runOneGame(homeData, awayData) {
  initGame(homeData, awayData);
  setupHalf(1); runHalf();
  setupHalf(2); runHalf();
  let otNum = 0;
  while (G.homeScore === G.awayScore && otNum < 5) { otNum++; setupHalf('OT'+otNum); runHalf(); }
}

function teamTotals(team) {
  const t = { pts:0,reb:0,ast:0,stl:0,blk:0,tov:0,fga:0,fgm:0,tpa:0,tpm:0,fta:0,ftm:0,pf:0 };
  for (const p of (team.allPlayers || [])) {
    const s = G.stats[p.name]; if (!s) continue;
    for (const k of Object.keys(t)) t[k] += (s[k] || 0);
  }
  return t;
}

function runSim() {
  const allTeams = (DATA || []).flatMap(c => c.teams || []);
  const homeName = document.getElementById('homeSelect').value;
  const awayName = document.getElementById('awaySelect').value;
  const n = parseInt(document.getElementById('numGames').value) || 1;
  const homeData = allTeams.find(t => t.name === homeName);
  const awayData  = allTeams.find(t => t.name === awayName);
  if (!homeData || !awayData) { document.getElementById('output').innerHTML = '<p class="warn">Team not found.</p>'; return; }
  if (homeName === awayName)  { document.getElementById('output').innerHTML = '<p class="warn">Select two different teams.</p>'; return; }

  if (n === 1) {
    runOneGame(homeData, awayData);
    renderResults();
    return;
  }

  const agg = {
    homeWins:0, awayWins:0, otGames:0,
    homeScores:[], awayScores:[],
    home:{ fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,reb:0,ast:0,stl:0,tov:0,pf:0 },
    away:{ fgm:0,fga:0,tpm:0,tpa:0,ftm:0,fta:0,reb:0,ast:0,stl:0,tov:0,pf:0 },
    poss:0
  };
  for (let i = 0; i < n; i++) {
    runOneGame(homeData, awayData);
    agg.homeScores.push(G.homeScore);
    agg.awayScores.push(G.awayScore);
    if (G.homeScore > G.awayScore) agg.homeWins++; else agg.awayWins++;
    if (typeof G.half === 'string' && G.half.startsWith('OT')) agg.otGames++;
    agg.poss += G.totalPossessions;
    const ht = teamTotals(G.home), at = teamTotals(G.away);
    for (const k of Object.keys(agg.home)) { agg.home[k] += (ht[k]||0); agg.away[k] += (at[k]||0); }
  }
  renderAggregateResults(agg, n, homeData.name, homeData.nickname||'', awayData.name, awayData.nickname||'');
}

// ═══════════════════════════════════════════════════════════════
// RESULTS DISPLAY
// ═══════════════════════════════════════════════════════════════

function pct(m, a) { return a > 0 ? (m/a*100).toFixed(1)+'%' : '-'; }
function avg(arr) { return arr.length ? (arr.reduce((s,v)=>s+v,0)/arr.length).toFixed(1) : '0'; }
function minmax(arr) { return arr.length ? Math.min(...arr)+'-'+Math.max(...arr) : '-'; }

// NCAA D1 2024-25 approximate averages
const NCAA_BENCH = { score:72.9, fg:0.455, tp:0.349, ft:0.722, tpaRate:0.381, ftaRate:0.293, pace:68.9, tov:13.0 };

function benchCell(val, bench, fmt) {
  const v = parseFloat(val), b = parseFloat(bench);
  const diff = Math.abs(v - b);
  const color = diff < b*0.05 ? '#3fb950' : (diff < b*0.12 ? '#d29922' : '#f85149');
  return `<td style="color:${color}">${fmt(v)}</td><td style="color:#484f58;font-size:0.8em">${b}</td>`;
}

function boxScoreHTML(team, score) {
  const allP = (team.allPlayers || []).filter(p => {
    const s = G.stats[p.name];
    return s && (s.fga > 0 || s.pts > 0 || s.reb > 0 || s.ast > 0);
  });
  allP.sort((a,b) => (G.stats[b.name].pts||0) - (G.stats[a.name].pts||0));
  const inLineup = new Set((team.lineup||[]).map(p=>p.name));
  let tot = { pts:0,reb:0,ast:0,stl:0,blk:0,tov:0,fga:0,fgm:0,tpa:0,tpm:0,fta:0,ftm:0,pf:0 };
  let rows = '';
  for (const p of allP) {
    const s = G.stats[p.name];
    for (const k of Object.keys(tot)) tot[k] += (s[k]||0);
    const dim = inLineup.has(p.name) ? '' : ' style="color:#8b949e"';
    rows += `<tr${dim}>
      <td><b>${p.name}</b></td><td>${p.position}</td>
      <td>${s.pts}</td><td>${s.reb}</td><td>${s.ast}</td><td>${s.stl}</td><td>${s.blk||0}</td><td>${s.tov}</td>
      <td>${s.fgm}/${s.fga}</td><td>${pct(s.fgm,s.fga)}</td>
      <td>${s.tpm}/${s.tpa}</td><td>${pct(s.tpm,s.tpa)}</td>
      <td>${s.ftm}/${s.fta}</td><td>${s.pf}</td>
    </tr>`;
  }
  return `<h3>${team.name} ${team.nickname}</h3>
    <table><tr>
      <th>Player</th><th>Pos</th>
      <th>Pts</th><th>Reb</th><th>Ast</th><th>Stl</th><th>Blk</th><th>TO</th>
      <th>FG</th><th>FG%</th><th>3PT</th><th>3P%</th><th>FT</th><th>PF</th>
    </tr>${rows}
    <tr class="totals">
      <td>TEAM</td><td>—</td>
      <td>${score}</td><td>${tot.reb}</td><td>${tot.ast}</td><td>${tot.stl}</td><td>${tot.blk||0}</td><td>${tot.tov}</td>
      <td>${tot.fgm}/${tot.fga}</td><td>${pct(tot.fgm,tot.fga)}</td>
      <td>${tot.tpm}/${tot.tpa}</td><td>${pct(tot.tpm,tot.tpa)}</td>
      <td>${tot.ftm}/${tot.fta}</td><td>${tot.pf}</td>
    </tr></table>`;
}

function pbpHTML(events) {
  return events.map(e => `<div class="ev ${e.type}">${e.text}</div>`).join('');
}

function scoreHistogram(scores, label) {
  const buckets = {};
  for (const s of scores) { const b = Math.floor(s/5)*5; buckets[b] = (buckets[b]||0)+1; }
  const keys = Object.keys(buckets).map(Number).sort((a,b)=>a-b);
  const max = Math.max(...Object.values(buckets));
  const rows = keys.map(k => {
    const bar = '\u2588'.repeat(Math.round(buckets[k]/max*20));
    return `<div style="font-size:0.75em;line-height:1.6"><span style="color:#8b949e;display:inline-block;width:52px">${k}–${k+4}</span><span style="color:#58a6ff">${bar}</span><span style="color:#8b949e;margin-left:6px">${buckets[k]}</span></div>`;
  }).join('');
  return `<div><div style="color:#79c0ff;margin-bottom:4px;font-size:0.85em">${label}</div>${rows}</div>`;
}

function renderAggregateResults(agg, n, homeName, homeNick, awayName, awayNick) {
  const f  = v => (v*100).toFixed(1)+'%';
  const f1 = v => v.toFixed(1);
  const hFgPct = agg.home.fga>0 ? agg.home.fgm/agg.home.fga : 0;
  const aFgPct = agg.away.fga>0 ? agg.away.fgm/agg.away.fga : 0;
  const hTpPct = agg.home.tpa>0 ? agg.home.tpm/agg.home.tpa : 0;
  const aTpPct = agg.away.tpa>0 ? agg.away.tpm/agg.away.tpa : 0;
  const hFtPct = agg.home.fta>0 ? agg.home.ftm/agg.home.fta : 0;
  const aFtPct = agg.away.fta>0 ? agg.away.ftm/agg.away.fta : 0;
  const hTpaR  = agg.home.fga>0 ? agg.home.tpa/agg.home.fga : 0;
  const aTpaR  = agg.away.fga>0 ? agg.away.tpa/agg.away.fga : 0;
  const hFtaR  = agg.home.fga>0 ? agg.home.fta/agg.home.fga : 0;
  const aFtaR  = agg.away.fga>0 ? agg.away.fta/agg.away.fga : 0;
  const avgPace = (agg.poss / n).toFixed(1);

  let html = `<h2>${n}-Game Series: ${homeName} ${agg.homeWins}–${agg.awayWins} ${awayName}`;
  if (agg.otGames) html += ` <span style="color:#8b949e;font-size:0.7em">(${agg.otGames} OT)</span>`;
  html += `</h2>`;

  html += `<h3>Scoring</h3>
  <table>
    <tr><th>Team</th><th>Avg</th><th>Range</th><th>W</th><th>L</th><th style="color:#484f58">NCAA avg</th></tr>
    <tr><td>${homeName} <span style="color:#8b949e">(home)</span></td><td>${avg(agg.homeScores)}</td><td>${minmax(agg.homeScores)}</td><td>${agg.homeWins}</td><td>${agg.awayWins}</td><td style="color:#484f58">${NCAA_BENCH.score}</td></tr>
    <tr><td>${awayName} <span style="color:#8b949e">(away)</span></td><td>${avg(agg.awayScores)}</td><td>${minmax(agg.awayScores)}</td><td>${agg.awayWins}</td><td>${agg.homeWins}</td><td style="color:#484f58">${NCAA_BENCH.score}</td></tr>
    <tr class="totals"><td colspan="6" style="color:#8b949e;font-size:0.8em">Avg pace: <b style="color:#e6edf3">${avgPace}</b> poss/game &nbsp;|&nbsp; NCAA avg: ${NCAA_BENCH.pace}</td></tr>
  </table>`;

  html += `<h3>Shooting <span style="color:#484f58;font-size:0.75em">(green = within 5% of NCAA avg, yellow = within 12%, red = far)</span></h3>
  <table>
    <tr><th>Team</th><th>FG%</th><th>ncaa</th><th>3P%</th><th>ncaa</th><th>FT%</th><th>ncaa</th><th>3PA Rate</th><th>ncaa</th><th>FTA/FGA</th><th>ncaa</th></tr>
    <tr><td>${homeName}</td>${benchCell(f(hFgPct),NCAA_BENCH.fg*100,f1)}${benchCell(f(hTpPct),NCAA_BENCH.tp*100,f1)}${benchCell(f(hFtPct),NCAA_BENCH.ft*100,f1)}${benchCell(f(hTpaR),NCAA_BENCH.tpaRate*100,f1)}${benchCell(f(hFtaR),NCAA_BENCH.ftaRate*100,f1)}</tr>
    <tr><td>${awayName}</td>${benchCell(f(aFgPct),NCAA_BENCH.fg*100,f1)}${benchCell(f(aTpPct),NCAA_BENCH.tp*100,f1)}${benchCell(f(aFtPct),NCAA_BENCH.ft*100,f1)}${benchCell(f(aTpaR),NCAA_BENCH.tpaRate*100,f1)}${benchCell(f(aFtaR),NCAA_BENCH.ftaRate*100,f1)}</tr>
  </table>`;

  html += `<h3>Other Stats (per-game averages)</h3>
  <table>
    <tr><th>Team</th><th>Reb</th><th>Ast</th><th>Stl</th><th>TOV</th><th style="color:#484f58">NCAA TOV avg</th><th>PF</th></tr>
    <tr><td>${homeName}</td><td>${(agg.home.reb/n).toFixed(1)}</td><td>${(agg.home.ast/n).toFixed(1)}</td><td>${(agg.home.stl/n).toFixed(1)}</td><td>${(agg.home.tov/n).toFixed(1)}</td><td style="color:#484f58">${NCAA_BENCH.tov}</td><td>${(agg.home.pf/n).toFixed(1)}</td></tr>
    <tr><td>${awayName}</td><td>${(agg.away.reb/n).toFixed(1)}</td><td>${(agg.away.ast/n).toFixed(1)}</td><td>${(agg.away.stl/n).toFixed(1)}</td><td>${(agg.away.tov/n).toFixed(1)}</td><td style="color:#484f58">${NCAA_BENCH.tov}</td><td>${(agg.away.pf/n).toFixed(1)}</td></tr>
  </table>`;

  html += `<h3>Score Distribution</h3>
  <div style="display:flex;gap:40px;flex-wrap:wrap;margin-top:8px">
    ${scoreHistogram(agg.homeScores, homeName+' (home)')}
    ${scoreHistogram(agg.awayScores, awayName+' (away)')}
  </div>`;

  document.getElementById('output').innerHTML = html;
}

function renderResults() {
  const ot = typeof G.half === 'string' && G.half.startsWith('OT') ? ` (${G.half})` : '';
  let html = `<h2>FINAL${ot}: ${G.home.name} ${G.homeScore} — ${G.away.name} ${G.awayScore}</h2>`;

  html += boxScoreHTML(G.home, G.homeScore);
  html += boxScoreHTML(G.away, G.awayScore);

  const ht = teamTotals(G.home), at = teamTotals(G.away);
  const f  = v => (v*100).toFixed(1)+'%';
  const f1 = v => v.toFixed(1);
  const hFgPct = ht.fga>0?ht.fgm/ht.fga:0, aFgPct = at.fga>0?at.fgm/at.fga:0;
  const hTpPct = ht.tpa>0?ht.tpm/ht.tpa:0, aTpPct = at.tpa>0?at.tpm/at.tpa:0;
  const hTpaR  = ht.fga>0?ht.tpa/ht.fga:0, aTpaR  = at.fga>0?at.tpa/at.fga:0;
  const hFtaR  = ht.fga>0?ht.fta/ht.fga:0, aFtaR  = at.fga>0?at.fta/at.fga:0;

  html += `<h3>Game Summary <span style="color:#484f58;font-size:0.75em">(green = within 5% of NCAA avg)</span></h3>
  <table>
    <tr><th>Team</th><th>Score</th><th>Poss</th><th>FG%</th><th>ncaa</th><th>3P%</th><th>ncaa</th><th>3PA Rate</th><th>ncaa</th><th>FTA/FGA</th><th>ncaa</th><th>TOV</th></tr>
    <tr><td>${G.home.name}</td><td>${G.homeScore}</td><td>${Math.round(G.totalPossessions/2)}</td>${benchCell(f(hFgPct),NCAA_BENCH.fg*100,f1)}${benchCell(f(hTpPct),NCAA_BENCH.tp*100,f1)}${benchCell(f(hTpaR),NCAA_BENCH.tpaRate*100,f1)}${benchCell(f(hFtaR),NCAA_BENCH.ftaRate*100,f1)}<td>${ht.tov}</td></tr>
    <tr><td>${G.away.name}</td><td>${G.awayScore}</td><td>${Math.round(G.totalPossessions/2)}</td>${benchCell(f(aFgPct),NCAA_BENCH.fg*100,f1)}${benchCell(f(aTpPct),NCAA_BENCH.tp*100,f1)}${benchCell(f(aTpaR),NCAA_BENCH.tpaRate*100,f1)}${benchCell(f(aFtaR),NCAA_BENCH.ftaRate*100,f1)}<td>${at.tov}</td></tr>
    <tr class="totals"><td colspan="12" style="color:#8b949e;font-size:0.8em">Total possessions: ${G.totalPossessions} | NCAA avg pace: ${NCAA_BENCH.pace}/game</td></tr>
  </table>`;

  html += `<h3>Play-by-Play (first 60)</h3><div class="pbp">${pbpHTML(pbp.slice(0, 60))}</div>`;
  html += `<h3>Play-by-Play (final 60)</h3><div class="pbp">${pbpHTML(pbp.slice(-60))}</div>`;

  document.getElementById('output').innerHTML = html;
}
"""

content = content[:idx] + new_tail + content[end_idx + len(end_marker):]
# Re-append the closing tags
content += end_marker

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("written OK")
print(f"New line count: {content.count(chr(10))}")
