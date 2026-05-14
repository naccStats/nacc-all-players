export const computeAnalytics = (players) => {
    if (!players.length) return {
        rankings: [],
        guildStats: [],
        chaosStats: { totalChaos: 0, chaosRate: 0, beastRankings: [] },
        percentiles: { p25: 0, p50: 0, p75: 0, p90: 0, p95: 0, p99: 0 },
        correlations: { cpFinals: 0, cpChaos: 0 },
        tiers: { SS: [], S: [], A: [], B: [], C: [] },
        global: {
          totalPlayers: 0,
          totalGuilds: 0,
          avgCP: 0,
          strongestPlayer: null,
          strongestGuild: null,
          medianCP: 0
        }
      };
    // Sort by CP for base ranking
    const byCP = [...players].sort((a, b) => b.cp - a.cp);
  
    // Normalize helper
    const norm = (arr, key) => {
      const vals = arr.map(p => p[key] || 0);
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      const range = max - min || 1;
      return (v) => (v - min) / range;
    };
  
    const nCP = norm(players, 'cp');
    const nFinals = norm(players, 'totalFinals');
    const nFdu = norm(players, 'fdu');
    const nFdd = norm(players, 'fdd');
    const nTribe = norm(players, 'tribulation');
  
    // Composite score (weighted)
    const rankings = byCP.map(p => {
      const composite =
        nCP(p.cp) * 0.35 +
        nFinals(p.totalFinals) * 0.25 +
        nFdu(p.fdu) * 0.15 +
        nFdd(p.fdd) * 0.15 +
        nTribe(p.tribulation) * 0.10;
  
      const percentile = ((byCP.indexOf(p) + 1) / byCP.length) * 100;
  
      return {
        ...p,
        composite: parseFloat(composite.toFixed(4)),
        percentile: parseFloat(percentile.toFixed(2))
      };
    });
  
    // Guild stats
    const guildMap = {};
    rankings.forEach(p => {
      if (!guildMap[p.guild]) {
        guildMap[p.guild] = { name: p.guild, members: [], totalCP: 0, chaosUsers: 0 };
      }
      guildMap[p.guild].members.push(p);
      guildMap[p.guild].totalCP += p.cp;
      if (p.hasChaos) guildMap[p.guild].chaosUsers++;
    });
  
    const guildStats = Object.values(guildMap).map(g => {
      const avgCP = g.totalCP / g.members.length;
      const chaosRate = (g.chaosUsers / g.members.length) * 100;
      const maxCP = Math.max(...g.members.map(m => m.cp));
      const dominance = (g.totalCP / rankings.reduce((s, r) => s + r.cp, 0)) * 100;
      return {
        ...g,
        memberCount: g.members.length,
        avgCP: parseFloat(avgCP.toFixed(2)),
        chaosRate: parseFloat(chaosRate.toFixed(2)),
        maxCP,
        dominance: parseFloat(dominance.toFixed(2)),
        members: g.members.sort((a, b) => b.cp - a.cp)
      };
    }).sort((a, b) => b.totalCP - a.totalCP);
  
    // Chaos stats
    const totalChaos = rankings.filter(p => p.hasChaos).length;
    const chaosRate = (totalChaos / rankings.length) * 100;
    const beastCounts = {};
    rankings.forEach(p => {
      if (p.chaosBeast) {
        beastCounts[p.chaosBeast] = (beastCounts[p.chaosBeast] || 0) + 1;
      }
    });
    const beastRankings = Object.entries(beastCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  
    const chaosStats = {
      totalChaos,
      chaosRate,
      beastRankings
    };
  
    // Percentiles & distributions
    const cpValues = rankings.map(p => p.cp);
    const sorted = [...cpValues].sort((a, b) => a - b);
    const q = (pct) => sorted[Math.floor((pct / 100) * (sorted.length - 1))];
    const percentiles = {
      p25: q(25),
      p50: q(50),
      p75: q(75),
      p90: q(90),
      p95: q(95),
      p99: q(99)
    };
  
    // Correlations (simple Pearson)
    const pearson = (x, y) => {
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((a, xi, i) => a + xi * y[i], 0);
      const sumX2 = x.reduce((a, b) => a + b * b, 0);
      const sumY2 = y.reduce((a, b) => a + b * b, 0);
      const num = n * sumXY - sumX * sumY;
      const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
      return den === 0 ? 0 : num / den;
    };
  
    const cpArr = rankings.map(p => p.cp);
    const finalsArr = rankings.map(p => p.totalFinals);
    const chaosArr = rankings.map(p => (p.hasChaos ? 1 : 0));
  
    const correlations = {
      cpFinals: parseFloat(pearson(cpArr, finalsArr).toFixed(3)),
      cpChaos: parseFloat(pearson(cpArr, chaosArr).toFixed(3))
    };
  
    // Tiers (based on percentile)
    const tiers = {
      SS: rankings.filter(p => p.percentile >= 98),
      S: rankings.filter(p => p.percentile >= 90 && p.percentile < 98),
      A: rankings.filter(p => p.percentile >= 70 && p.percentile < 90),
      B: rankings.filter(p => p.percentile >= 40 && p.percentile < 70),
      C: rankings.filter(p => p.percentile < 40)
    };
  
    // Global
    const global = {
      totalPlayers: rankings.length,
      totalGuilds: guildStats.length,
      avgCP: parseFloat((rankings.reduce((s, p) => s + p.cp, 0) / rankings.length).toFixed(2)),
      strongestPlayer: rankings[0],
      strongestGuild: guildStats[0],
      medianCP: percentiles.p50
    };
  
    return { rankings, guildStats, chaosStats, percentiles, correlations, tiers, global };
  };
  