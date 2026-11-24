import { C, FONT, PAIR, tip, tooltip } from '../utils/chartTheme';
import { formatStat } from '../utils/formatters';

export const RADAR_AXES = [
  ['healUp', 'Heal up'], ['healDown', 'Heal down'], ['fdu', 'FDU'],
  ['fdd', 'FDD'], ['beastUp', 'Beast up'], ['beastDown', 'Beast down'],
];

/* series: [{ name, row }], one or two. max: { key: value } puts every axis on its own shared scale;
   without it the axes share one scale, the highest stat of the rows drawn. */
export function radarOption(series, max, width = 600) {
  const own = Math.max(...series.flatMap(({ row }) => RADAR_AXES.map(([k]) => row[k])), 1);
  return {
    tooltip: tooltip({
      trigger: 'item',
      formatter: (p) => tip(p.name, RADAR_AXES.map(([k, n]) => [n, formatStat(series[p.dataIndex].row[k])])),
    }),
    radar: {
      indicator: RADAR_AXES.map(([k, name]) => ({ name, max: max ? max[k] : own })),
      center: ['50%', '52%'],
      radius: width < 400 ? '56%' : '70%',
      axisName: { color: C.soft, fontSize: 13, fontFamily: FONT },
      splitNumber: 4,
      splitLine: { lineStyle: { color: C.line } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: C.line } },
    },
    series: [{
      type: 'radar',
      symbolSize: 8,
      data: series.map(({ name, row, color }, i) => {
        const c = color || PAIR[i];
        return {
          name,
          value: RADAR_AXES.map(([k]) => row[k]),
          areaStyle: { color: c, opacity: i ? 0.06 : 0.18 },
          lineStyle: { color: c, width: 2 },
          itemStyle: { color: c },
        };
      }),
    }],
  };
}
