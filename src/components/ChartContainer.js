import { useRef, useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';

export default function ChartContainer({ option, ratio = 9 / 16, maxHeight = 400, opts = {} }) {
  const wrapRef  = useRef(null);
  const chartRef = useRef(null);
  const [height, setHeight] = useState(240);

  const compute = useCallback((width) => {
    if (!width) return undefined;
    return Math.max(Math.min(Math.round(width * ratio), maxHeight), 180);
  }, [ratio, maxHeight]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const applyWidth = (width) => {
      const h = compute(width);
      if (h !== undefined) setHeight(h);
    };
    applyWidth(wrapRef.current.offsetWidth);
    const ro = new ResizeObserver((entries) => {
      applyWidth(entries[0]?.contentRect?.width);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [compute]);

  useEffect(() => {
    const inst = chartRef.current?.getEchartsInstance?.();
    if (inst) inst.resize();
  }, [height]);

  return (
    <div ref={wrapRef} style={{ width: '100%', height }}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas', ...opts }}
        notMerge
        lazyUpdate={false}
      />
    </div>
  );
}
