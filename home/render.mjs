/* The home page's body, written from public/data/players.csv. Every figure on the page comes from the
   file, so updating the CSV and building again updates the page. Markup and classes: the design kit in
   public/assets (system.css, layout, motion, moments). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beastSvg, cpHtml, crestSvg, logoSvg, rankSvg, tierHtml } from '../src/brand/glyphs.js';
import { DATA_AS_OF } from '../src/data-date.js';
import { PAIR, beastColor, beastNames } from '../src/utils/chartTheme.js';
import { formatCP, formatStat } from '../src/utils/formatters.js';
import { checkRows, parseCsv, parsePlayers, parseTopPlayers } from '../src/utils/playerData.js';
import { SCORE_PARTS, guildScore } from '../src/utils/guildScore.js';
import { computeGlobalStats, computeGuildStats, isActive } from '../src/utils/statsEngine.js';
import { TRIB_PREFIXES, tribColor, tribName, tribPrefix } from '../src/utils/tribulationSystem.js';

const DATA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const csv = (name, dir) => parseCsv(fs.readFileSync(path.join(dir, name), 'utf8'));
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen'];

const ARROW = '<svg class="m-arrow" viewBox="0 0 12 12" aria-hidden="true"><path class="m-arrow__stem" d="M1 6h8"/><path class="m-arrow__head" d="M4.5 2.5 8 6l-3.5 3.5"/></svg>';
const CHEV = '<svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const app = (route = '') => `app/#/${route}`;

function facts(dir) {
  const players = parsePlayers(csv('players.csv', dir));
  const ranked = [...players].sort((a, b) => b.cp - a.cp);
  const stats = computeGlobalStats(players);
  const avg = (k) => players.reduce((s, p) => s + p[k], 0) / players.length;
  const guildTotal = stats.topGuilds.reduce((s, g) => s + g.totalCP, 0);
  const tiers = TRIB_PREFIXES.filter((t) => stats.tribDistribution[t]).map((t) => ({ t, name: tribName(t), n: stats.tribDistribution[t] }));
  const beasts = beastNames(players).map((name) => ({ name, n: players.filter((p) => p.chaosBeast === name).length })).sort((a, b) => b.n - a.n);
  const asc = ranked.map((p) => p.cp).reverse();
  const bins = 12;
  const lo = Math.log10(asc[0]);
  const step = (Math.log10(asc[asc.length - 1]) - lo) / bins;
  const spread = new Array(bins).fill(0);
  asc.forEach((v) => { spread[Math.min(Math.floor((Math.log10(v) - lo) / step), bins - 1)] += 1; });
  return {
    ranked, stats, guildTotal, tiers, beasts, spread, players,
    guildStats: computeGuildStats(players),
    total: stats.total,
    median: asc[Math.floor(asc.length / 2)],
    averages: { cp: avg('cp'), fdu: avg('fdu'), fdd: avg('fdd'), totalFinals: avg('totalFinals') },
    topCount: parseTopPlayers(csv('topPlayers.csv', dir)).length,
  };
}

const asOf = `<span class="asof">As of ${esc(DATA_AS_OF)}</span>`;
const power = (p, max) => `<span class="cp"><span>${cpHtml(formatCP(p.cp))}</span><i><b style="width:${((p.cp / max) * 100).toFixed(1)}%"></b></i></span>`;

const bar = (label, value, share, color, crest) =>
  `<div class="nx-bar"><span>${crest ? crestSvg(crest, 26) : ''}${esc(label)}</span><i><b style="width:${Math.max(1, share * 100).toFixed(1)}%${color ? `;background:${color}` : ''}"></b></i><em>${esc(value)}</em></div>`;

const listRow = (p, i, on) =>
  `<li class="ui-win__row nx-row${on ? ' is-sel' : ''}"><span class="nx-rank">${rankSvg(i + 1, 30)}</span><span class="ui-win__who">${crestSvg(p.guild, 26)}<span>${esc(p.player)}</span></span><span class="ui-win__sub">${esc(p.guild || 'No guild')}</span><span class="nx-cp">${formatCP(p.cp)}</span></li>`;

function profilePane(p, d) {
  const rank = d.ranked.indexOf(p) + 1;
  const rows = [
    ['Combat power', 'cp', formatCP], ['Finals damage up', 'fdu', formatStat],
    ['Finals damage down', 'fdd', formatStat], ['Total Finals', 'totalFinals', formatStat],
  ].map(([label, k, fmt]) => {
    const max = Math.max(p[k], d.averages[k]) * 1.06;
    return `<div class="nx-vs"><span>${label}</span><em>${fmt(p[k])}</em><i><b style="width:${((p[k] / max) * 100).toFixed(1)}%"></b><u style="left:${((d.averages[k] / max) * 100).toFixed(1)}%"></u></i><small>Region average ${fmt(d.averages[k])}</small></div>`;
  }).join('');
  return `<div class="nx-pf">
        <div class="nx-pf__head">${crestSvg(p.guild, 56)}<div><div class="nx-pf__name">${esc(p.player)}</div>
        <div class="nx-pf__meta">${esc(p.guild || 'No guild')}<span>UID ${p.uid}</span><span>${isActive(p) ? 'Active' : 'AFK'}</span></div></div></div>
        <dl class="nx-pf__facts"><div><dt>Region rank</dt><dd>${rank} of ${d.total}</dd></div><div><dt>Tribulation</dt><dd>${tierHtml(p.tribulation)}</dd></div><div><dt>Chaos beast</dt><dd class="nx-beast">${p.chaosBeast ? beastSvg(p.chaosBeast, beastColor(p.chaosBeast), 20) + esc(p.chaosBeast) : 'None'}</dd></div></dl>
        ${rows}
      </div>`;
}

const step = (title, text, label, piece) => `<li class="mo-pc__step">
            <h3>${title}</h3>
            <p>${text}</p>
            <figure class="mo-pc__visual" role="img" aria-label="${esc(label)}"><div class="ui nx-step" aria-hidden="true">${piece}</div></figure>
          </li>`;

/* ---- The three steps: the app's own screens, drawn from the sheet ---- */

/* the two letters that start most of the strongest players' names: a search with a full list of answers */
function searchLetters(ranked) {
  const count = {};
  ranked.slice(0, 120).forEach((p) => {
    const q = p.player.toLowerCase().slice(0, 2);
    if (/^[a-z]{2}$/.test(q)) count[q] = (count[q] || 0) + 1;
  });
  return Object.entries(count).sort((x, y) => y[1] - x[1])[0]?.[0] || ranked[0].player.slice(0, 2);
}

function searchScreen(d) {
  const q = searchLetters(d.ranked);
  const hits = d.ranked.filter((p) => p.player.toLowerCase().startsWith(q)).slice(0, 6);
  return `<div class="nx-find"><svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg><span>${esc(q)}</span></div>
      <div class="nx-hits">${hits.map((p, i) => `<div class="nx-hit${i === 0 ? ' is-on' : ''}">${crestSvg(p.guild, 30)}<b>${esc(p.player)}</b><span>${esc(p.guild || 'No guild')}</span><em>${formatCP(p.cp)}</em></div>`).join('')}</div>`;
}

function recordScreen(d) {
  const p = d.ranked[1] || d.ranked[0];
  const rank = d.ranked.indexOf(p) + 1;
  const mates = d.ranked.filter((m) => p.guild && m.guild === p.guild);
  const tiles = [
    ['Region rank', `${rank} of ${d.total}`],
    ['Place in the guild', mates.length ? `${mates.indexOf(p) + 1} of ${mates.length}` : 'No guild'],
    ['Combat power', formatCP(p.cp)],
    ['Total Finals', formatStat(p.totalFinals)],
  ];
  const gap = [['Combat power', 'cp'], ['Total Finals', 'totalFinals']].map(([label, k]) => {
    const max = Math.max(p[k], d.averages[k]) * 1.06;
    return `<div class="nx-gap"><span>${label}</span><i><b style="width:${((p[k] / max) * 100).toFixed(1)}%"></b><u style="left:${((d.averages[k] / max) * 100).toFixed(1)}%"></u></i></div>`;
  }).join('');
  return `<div class="nx-rec">${rankSvg(rank, 52)}<div><b>${esc(p.player)}</b><span>${crestSvg(p.guild, 22)}${esc(p.guild || 'No guild')}</span></div>${tierHtml(p.tribulation)}</div>
      <dl class="nx-tiles">${tiles.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      <div class="nx-gaps">${gap}</div>`;
}

function compareScreen(d) {
  const [a, b] = d.guildStats;
  if (!b) return '';
  const [sa, sb] = [guildScore(a, b), guildScore(b, a)];
  const side = (g, s, i) => `<div>${crestSvg(g.name, 48)}<span><i style="background:${PAIR[i]}"></i>${esc(g.name)}</span><b>${s.toFixed(1)}</b></div>`;
  return `<div class="nx-duel">${side(a, sa, 0)}${side(b, sb, 1)}</div>
      <div class="nx-duelbar"><i style="flex:${sa.toFixed(2)};background:${PAIR[0]}"></i><i style="flex:${sb.toFixed(2)};background:${PAIR[1]}"></i></div>
      <div class="nx-parts">${SCORE_PARTS.map((p) => `<div><span>${p.label}</span><em>${p.of(a, b).toFixed(1)}</em><em>${p.of(b, a).toFixed(1)}</em></div>`).join('')}</div>`;
}

const question = (q, a) => `<div class="faq__item"><h3>${q}</h3><p>${a}</p></div>`;

const card = (title, text, label, piece) => `<article class="card card--row card--open span-6">
            <h3>${title}</h3>
            <p>${text}</p>
            <div class="panel"><div class="stage"><div class="nx-piece ui ui-panel" role="img" aria-label="${esc(label)}">${piece}</div></div></div>
          </article>`;

/* dir: the folder the two CSV files are read from */
export function renderHome(dir = DATA) {
  const d = facts(dir);
  const { stats, total, ranked, tiers, beasts } = d;
  const guilds = stats.topGuilds;
  const lead = guilds[0];
  const open = ranked[0];
  const peak = Math.max(...d.spread);
  const owned = beasts.filter((b) => b.n);

  const guildPiece = guilds.slice(0, 6).map((g) => bar(g.name, formatCP(g.totalCP), g.totalCP / lead.totalCP, null, g.name)).join('');
  const tierMax = Math.max(...tiers.map((t) => t.n));
  const tierPiece = tiers.slice(0, 6).map((t) => bar(t.name, t.n, t.n / tierMax, tribColor(t.t))).join('');
  const beastPiece = `<div class="nx-stack">${owned.map((b) => `<b style="flex:${b.n};background:${beastColor(b.name)}"></b>`).join('')}</div>`
    + owned.map((b) => `<div class="nx-key">${beastSvg(b.name, beastColor(b.name), 20)}<span>${b.name}</span><em>${b.n}</em></div>`).join('');
  const spreadPiece = `<div class="nx-hist">${d.spread.map((n) => `<b style="height:${Math.max(2, (n / peak) * 100).toFixed(1)}%"></b>`).join('')}</div><div class="nx-axis"><span>${formatCP(ranked[ranked.length - 1].cp)}</span><span>${formatCP(d.median)} median</span><span>${formatCP(ranked[0].cp)}</span></div>`;

  return `<!-- type: software
     deal: hero centred, nav nav-centre, close close-type, footer footer-dark, rhythm surface-pairs, buttons arrow, mark the client logo (brand/glyphs.js), grounds none
     palette warm-black-gold (the game's gold on near-black), type Marcellus and Figtree, numerals Spectral (the client asked for richer faces)
     moments: pinned-chapters (#rank) -->
<header class="nav nav--centre">
  <div class="wrap nav__bar">
    <a class="skip-link" href="#top">Skip to content</a>
    <a class="nav__logo" href="#top">${logoSvg('nav')}NACC</a>
    <nav class="nav__links" aria-label="Main">
      <div class="nav__item">
        <a class="nav__link" href="#stats">Stats ${CHEV}</a>
        <div class="nav__menu">
          <div class="wrap grid">
            <div class="menu-col span-3">
              <p class="t-label">Players</p>
              <a href="${app('rankings')}">Player list<span>All ${total}, sorted and filtered</span></a>
              <a href="${app('insights')}">Insights<span>Heal, beast and Finals stats</span></a>
            </div>
            <div class="menu-col span-3">
              <p class="t-label">Guilds</p>
              <a href="${app('guilds')}">Guild list<span>Power, roster and tiers</span></a>
              <a href="${app('compare')}">Guild comparison<span>Two guilds, one score</span></a>
            </div>
            <div class="menu-col span-3">
              <p class="t-label">Region</p>
              <a href="${app()}">Overview<span>The region on one page</span></a>
              <a href="${app('bestiary')}">Chaos beasts<span>Owners and their power</span></a>
            </div>
            <div class="menu-col span-3">
              <p class="t-label">Numbers</p>
              <a href="${app('advanced')}">Advanced<span>Spreads, clusters and 3D</span></a>
              <a href="#questions">Questions<span>What FDU and AFK mean</span></a>
            </div>
          </div>
        </div>
      </div>
      <div class="nav__item"><a class="nav__link" href="#players">Players</a></div>
      <div class="nav__item"><a class="nav__link" href="#rank">Steps</a></div>
      <div class="nav__item"><a class="nav__link" href="#questions">Questions</a></div>
    </nav>
    <div class="nav__actions">
      <a class="btn btn--primary" href="${app('rankings')}">Find your rank${ARROW}</a>
    </div>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-label="Menu">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 5h14M2 13h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
    </button>
  </div>
</header>

<main id="top">
  <section class="hero hero--centred" data-enter aria-labelledby="hero-h">
    <div class="wrap"><div class="hero-text">
      <div class="hero__c">
        <h1 id="hero-h">NACC player and guild rankings</h1>
        <p class="hero__lead">Combat power, Finals and chaos beasts for ${total} players in the North America region of Nobody&rsquo;s Adventure Chop Chop.</p>
        <div class="btn-row"><a class="btn btn--primary" href="${app('rankings')}">Find your rank${ARROW}</a><a class="btn btn--secondary" href="${app('compare')}">Compare guilds</a></div>
      </div>
      <div class="hero__window" role="img" aria-label="The player list: rank, player, guild, tribulation and combat power">
        <div class="ly-piece ui nx-win" aria-hidden="true">
          <div class="nx-win__bar"><b>Players</b>${asOf}</div>
          <div class="nx-win__head"><span>Rank</span><span>Player</span><span>Guild</span><span>Tribulation</span><span>CP</span></div>
          ${ranked.slice(0, 13).map((p, i) => `<div class="nx-win__row top-${i + 1}"><span class="nx-win__rank">${rankSvg(i + 1, 38)}</span><b>${crestSvg(p.guild, 36)}<span>${esc(p.player)}</span></b><span>${esc(p.guild)}</span>${tierHtml(p.tribulation)}${power(p, ranked[0].cp)}</div>`).join('')}
        </div>
      </div>
    </div></div>
  </section>

  <section class="section" id="players" aria-labelledby="players-h">
    <div class="wrap">
      <div class="grid">
        <div class="span-6"><h2 id="players-h">A record for every player</h2></div>
        <div class="span-6 start-7 stack-4">
          <p>The list ranks all ${total} players by combat power. Open one for Finals, tribulation, chaos beast and the gap to the region average.</p>
          <p><a class="link" href="${app('insights')}">See the top ${d.topCount} in detail</a></p>
        </div>
      </div>
      <div class="ui app fill" role="img" aria-label="The player list beside the open record of ${esc(open.player)}">
        <div class="app__pane app__pane--list">
          <div class="ui-panel ui-win">
            <div class="ui-win__bar"><span class="ui-win__crumb"><b>Players</b></span><span class="ui-spacer"></span><span class="ui-win__search" aria-hidden="true"><svg class="ui-icon" viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg><span class="ui-win__ph">Name or UID</span></span></div>
            <ul class="ui-win__rows">${ranked.slice(0, 14).map((p, i) => listRow(p, i, i === 0)).join('')}</ul>
          </div>
        </div>
        <div class="app__pane app__pane--open">${profilePane(open, d)}</div>
      </div>
    </div>
  </section>

  <section class="section g2 ground-surface" id="stats" aria-labelledby="stats-h">
    <div class="wrap">
      <div class="group">
        <div class="section-head">
          <h2 id="stats-h">Stats for the whole region. <span class="muted">Guilds, tiers, beasts and power.</span></h2>
        </div>
        <div class="grid">
          ${card('Ranks guilds by power', `${lead.name} leads ${guilds.length} guilds with ${formatCP(lead.totalCP)}, or ${((lead.totalCP / d.guildTotal) * 100).toFixed(1)}% of all guild power.`, 'Six guilds ranked by total combat power', guildPiece)}
          ${card('Sorts players by tier', `${WORDS[tiers.length]} tribulation tiers are in use. ${WORDS[tiers[0].n] || tiers[0].n} ${tiers[0].n === 1 ? 'player has' : 'players have'} reached ${tiers[0].name}.`, 'Players in the six highest tribulation tiers', tierPiece)}
        </div>
      </div>
      <div class="grid">
        ${card('Counts players by beast', `${stats.chaosCount} players own a chaos beast. ${owned[0].name} has the most owners, ${owned[0].n}.`, 'Owners of each chaos beast', beastPiece)}
        ${card('Charts player power', `Half of all players hold less than ${formatCP(d.median)}. The strongest holds ${formatCP(ranked[0].cp)}.`, 'How many players sit in each combat power band', spreadPiece)}
      </div>
    </div>
  </section>

  <section class="section" id="rank" style="--h: 2" data-moment="pinned-chapters" aria-labelledby="rank-h">
    <div class="wrap mo-pc__grid">
      <div class="mo-pc__text">
        <h2 id="rank-h">Three steps to your rank</h2>
        <ol class="mo-pc__steps">
          ${step('Search a player name or UID', 'Two letters are enough. The search is on every page and lists players, guilds and combat power.', 'The search field with matching players listed under it', searchScreen(d))}
          ${step('Read the player record', 'Region rank, place in the guild, tribulation, and each stat against the region average.', 'A player record with rank, tribulation and combat power', recordScreen(d))}
          ${step('Compare two guilds', 'Pick any two to see seven stats side by side and a score out of 100.', 'The two strongest guilds compared with a score for each', compareScreen(d))}
        </ol>
      </div>
      <div class="mo-pc__visuals frame"></div>
    </div>
  </section>

  <section class="section" id="questions" aria-labelledby="questions-h">
    <div class="wrap">
      <div class="grid">
        <div class="span-6 stack-4 nx-ask">
          <h2 id="questions-h">Questions about the numbers</h2>
          <div class="frame frame--photo nx-art"><img class="frame__img" src="/home/ink-figure.jpg" alt="Ink painting of a robed cultivator with a staff above burning lotus petals" loading="lazy" width="700" height="430" data-source="client" data-subject="game character"></div>
        </div>
        <div class="span-6 start-7">
          <div class="faq">
            ${question('What do B and T mean in the rankings?', 'Billions and trillions of combat power. 1T is 1000B.')}
            ${question('What are a player&rsquo;s FDU and FDD?', 'Finals damage up and Finals damage down. Added together they are total Finals.')}
            ${question('What does AFK mean beside a player?', `The player sheet marks the player as inactive. As of ${esc(DATA_AS_OF)}, ${stats.afkCount} of ${total} players are.`)}
            ${question('Which players have heal and beast stats?', `The top ${d.topCount} players. Everyone else has combat power, Finals and tribulation.`)}
            ${question('Can I download the player list?', 'Yes. The Players page saves it as a CSV file, with your filters applied.')}
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="footer closing footer--dark ground-inverse" id="contact" aria-labelledby="close-h">
  <div class="wrap">
    <div class="closing__cta close--type">
      <div class="section-head">
        <h2 id="close-h">Your name among ${total} players</h2>
      </div>
      <a class="btn btn--primary btn--xl btn--wide" href="${app('rankings')}">Find your rank${ARROW}</a>
    </div>
    <div class="closing__links">
      <div class="grid">
        <div class="span-4 stack-4">
          <a class="nav__logo" href="#top">${logoSvg('foot')}NACC</a>
          <p class="footer__lede">Player and guild stats for Nobody&rsquo;s Adventure Chop Chop, North America region.</p>
        </div>
        <div class="span-2 footer__col"><h3>Players</h3><ul><li><a href="${app('rankings')}">Player list</a></li><li><a href="${app('insights')}">Insights</a></li></ul></div>
        <div class="span-2 footer__col"><h3>Guilds</h3><ul><li><a href="${app('guilds')}">Guild list</a></li><li><a href="${app('compare')}">Guild comparison</a></li></ul></div>
        <div class="span-2 footer__col"><h3>Region</h3><ul><li><a href="${app()}">Overview</a></li><li><a href="${app('bestiary')}">Chaos beasts</a></li><li><a href="${app('advanced')}">Advanced</a></li></ul></div>
        <div class="span-2 footer__col"><h3>This page</h3><ul><li><a href="#players">Players</a></li><li><a href="#rank">Steps</a></li><li><a href="#questions">Questions</a></li></ul></div>
      </div>
      <div class="footer__legal">
        ${asOf}
        <span>&copy; ${new Date().getFullYear()} NACC</span>
      </div>
    </div>
  </div>
</footer>`;
}

/* Slips in the sheets, for the terminal and the build log: [{ file, line, message }] */
export function checkData(dir = DATA) {
  const [main, top] = ['players.csv', 'topPlayers.csv'].map((name) => csv(name, dir));
  const isTier = (t) => Boolean(tribPrefix(t));
  const out = [
    ...checkRows(main, isTier).map((w) => ({ file: 'public/data/players.csv', ...w })),
    ...checkRows(top, isTier).map((w) => ({ file: 'public/data/topPlayers.csv', ...w })),
  ];
  const byUid = new Map(parsePlayers(main).map((p) => [p.uid, p]));
  const apart = parseTopPlayers(top).filter((t) => {
    const p = byUid.get(t.uid);
    return p && ['cp', 'fdu', 'fdd'].some((k) => Math.abs(p[k] - t[k]) > 0.05);
  });
  if (apart.length) {
    out.push({
      file: 'public/data/topPlayers.csv', line: 1,
      message: `CP, FDU or FDD differ from players.csv for ${apart.length} players: ${apart.map((p) => p.player).join(', ')}`,
    });
  }
  return out;
}
