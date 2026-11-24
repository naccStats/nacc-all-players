import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePlayers, useTopPlayers } from '../context/DataContext';
import { isActive } from '../utils/statsEngine';
import { formatCP, formatStat } from '../utils/formatters';
import { Beast, Card, Empty, PageHead, Stats, Tier } from '../components/ui';
import Chart from '../components/Chart';
import { radarOption } from '../components/radar';

/* Letter grade by how far up the region a player stands, in percent from the top. */
const grade = (topPct) => (topPct <= 2 ? 'SS' : topPct <= 10 ? 'S' : topPct <= 30 ? 'A' : topPct <= 60 ? 'B' : 'C');

const COMPARED = [
  { key: 'cp', label: 'Combat power', fmt: formatCP },
  { key: 'fdu', label: 'Finals damage up (FDU)', fmt: formatStat },
  { key: 'fdd', label: 'Finals damage down (FDD)', fmt: formatStat },
  { key: 'totalFinals', label: 'Total Finals', fmt: formatStat },
];

function Versus({ player, averages }) {
  return (
    <div className="versus">
      {COMPARED.map(({ key, label, fmt }) => {
        const [v, avg] = [player[key], averages[key]];
        const max = Math.max(v, avg) * 1.1 || 1;
        const diff = avg ? ((v - avg) / avg) * 100 : 0;
        return (
          <div key={key}>
            <div className="versus__head">
              <span>{label}</span>
              <b className="num">{fmt(v)}</b>
            </div>
            <div className="scale" role="img" aria-label={`${label} ${fmt(v)}, region average ${fmt(avg)}`}>
              <span style={{ width: `${(v / max) * 100}%` }} />
              <i style={{ left: `${(avg / max) * 100}%` }} />
            </div>
            <div className="versus__head" style={{ margin: '8px 0 0', fontSize: 14 }}>
              <span className="muted">Region average {fmt(avg)}</span>
              <span className={diff >= 0 ? 'up' : 'down'}>
                {Math.abs(diff).toFixed(0)}% {diff >= 0 ? 'above' : 'below'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Profile() {
  const { uid } = useParams();
  const navigate = useNavigate();
  const players = usePlayers();
  const top = useTopPlayers();

  const { player, rank, averages, guildRank, guildSize } = useMemo(() => {
    const sorted = [...players].sort((a, b) => b.cp - a.cp);
    const at = sorted.findIndex((p) => p.uid === String(uid));
    const found = sorted[at];
    const mates = found?.guild ? sorted.filter((p) => p.guild === found.guild) : [];
    const avg = (k) => players.reduce((s, p) => s + p[k], 0) / players.length;
    return {
      player: found,
      rank: at + 1,
      guildRank: mates.indexOf(found) + 1,
      guildSize: mates.length,
      averages: Object.fromEntries(COMPARED.map(({ key }) => [key, avg(key)])),
    };
  }, [players, uid]);

  const extended = player && top?.find((t) => t.uid === player.uid || t.player === player.player);

  if (!player) {
    return (
      <Card className="card--flush">
        <Empty title="Player not found">
          <p>No tracked player has the UID {uid}.</p>
          <Link className="btn btn--secondary" to="/rankings">See all players</Link>
        </Empty>
      </Card>
    );
  }

  const topPct = (rank / players.length) * 100;
  return (
    <>
      <button type="button" className="back" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/rankings'))}>
        <ArrowLeft size={16} aria-hidden="true" />Back
      </button>
      <div>
        <PageHead title={player.player} crest={player.guild} />
        <div className="profile__meta">
          {player.guild
            ? <Link className="link" to={`/rankings?guild=${encodeURIComponent(player.guild)}`}>{player.guild}</Link>
            : <span>No guild</span>}
          <span className={isActive(player) ? 'up' : 'muted'}>{isActive(player) ? 'Active' : 'AFK'}</span>
          <span className="muted">{player.region}</span>
          <span className="muted">UID {player.uid}</span>
        </div>
      </div>

      <Stats
        items={[
          { label: 'Region rank', value: rank, sub: `of ${players.length}, top ${topPct.toFixed(1)}%` },
          { label: 'Grade', value: grade(topPct), sub: 'By rank in the region' },
          { label: 'Combat power', value: formatCP(player.cp), sub: guildRank ? `${guildRank} of ${guildSize} in the guild` : 'Not in a guild' },
          { label: 'Tribulation', value: <Tier trib={player.tribulation} />, sub: player.tribulation },
          { label: 'Chaos beast', value: player.hasChaos ? <Beast player={player} /> : 'None' },
        ]}
      />

      {extended ? (
        <div className="cols">
          <Card className="s5" title="Against the region" note="The line marks the average player"><Versus player={player} averages={averages} /></Card>
          <Card className="s7" title="Combat profile" note="Each stat as a share of this player's highest">
            <Chart option={(w) => radarOption([{ name: player.player, row: extended }], null, w)} ratio={0.62} maxHeight={340} />
            <dl className="pairs" style={{ marginTop: 12 }}>
              {[
                ['Heal up', extended.healUp], ['Heal down', extended.healDown], ['Total heal', extended.totalHeal],
                ['Beast up', extended.beastUp], ['Beast down', extended.beastDown], ['Total beast', extended.totalBeast],
              ].map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{formatStat(v)}</dd></div>)}
            </dl>
          </Card>
        </div>
      ) : (
        <Card title="Against the region" note="The line marks the average player">
          <Versus player={player} averages={averages} />
          {top && <p className="card__foot">Heal and beast stats are tracked for the top {top.length} players only.</p>}
        </Card>
      )}
    </>
  );
}

