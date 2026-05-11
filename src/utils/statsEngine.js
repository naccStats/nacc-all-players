export const computeGlobalStats = (players) => {
  if (!players.length) {
    return {
      total: 0,
      avgCP: 0,
      maxCP: 0,
      activeCount: 0,
      chaosCount: 0,
      guildCount: 0,
      afkCount: 0,
      topPlayers: [],
      topGuilds: [],
      tribDistribution: {}
    };
  }

  const cps = players.map(p => p.cp || 0);
  const total = players.length;
  const avgCP = cps.reduce((s, v) => s + v, 0) / total;
  const maxCP = Math.max(...cps);

  const chaosCount = players.filter(p => p.hasChaos).length;
  const activeCount = players.filter(p => p.updated !== 'N' && p.updated !== 'NO').length;
  const afkCount = total - activeCount;

  const guildMap = {};
  const tribDist = {};

  for (const p of players) {
    const guildName = p.guild || 'NoGuild';
    if (!guildMap[guildName]) guildMap[guildName] = { name: guildName, totalCP: 0, members: 0 };
    guildMap[guildName].totalCP += p.cp || 0;
    guildMap[guildName].members += 1;

    if (p.tribulation) {
      // Group by tier prefix (strip trailing sub-rank digit) for pie charts
      const tKey = p.tribulation.replace(/\d+$/, '');
      tribDist[tKey] = (tribDist[tKey] || 0) + 1;
    }
  }

  const topGuilds = Object.values(guildMap)
    .sort((a, b) => b.totalCP - a.totalCP)
    .slice(0, 20);

  const topPlayers = [...players]
    .sort((a, b) => (b.cp || 0) - (a.cp || 0))
    .slice(0, 20);

  const guildCount = Object.keys(guildMap).length;

  return {
    total,
    avgCP,
    maxCP,
    activeCount,
    chaosCount,
    guildCount,
    afkCount,
    topPlayers,
    topGuilds,
    tribDistribution: tribDist
  };
};

export const computeGuildStats = (players) => {
  if (!players.length) return [];

  const map = {};
  for (const p of players) {
    const guildName = p.guild || 'NoGuild';
    if (!map[guildName]) {
      map[guildName] = {
        name: guildName,
        members: [],
        totalCP: 0,
        chaosCount: 0,
        sumFDU: 0,
        sumFDD: 0,
        sumFinals: 0,
        tribBreakdown: {}
      };
    }

    const guildData = map[guildName];
    guildData.members.push(p);
    guildData.totalCP += p.cp || 0;
    if (p.hasChaos) guildData.chaosCount++;
    guildData.sumFDU += p.fdu || 0;
    guildData.sumFDD += p.fdd || 0;
    guildData.sumFinals += p.totalFinals || 0;
    if (p.tribulation) {
      guildData.tribBreakdown[p.tribulation] = (guildData.tribBreakdown[p.tribulation] || 0) + 1;
    }
  }

  return Object.values(map).map(g => {
    const n = g.members.length || 1;
    return {
      name: g.name,
      memberCount: n,
      totalCP: g.totalCP,
      avgCP: g.totalCP / n,
      chaosCount: g.chaosCount,
      chaosRate: g.chaosCount / n,
      avgFDU: g.sumFDU / n,
      avgFDD: g.sumFDD / n,
      avgFinals: g.sumFinals / n,
      tribBreakdown: g.tribBreakdown,
      members: g.members
    };
  }).sort((a, b) => b.totalCP - a.totalCP);
};
