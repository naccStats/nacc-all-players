import { useRef, useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';

// IMPORTANT: do NOT import from chartResponsive.js here.
// Pages import both ChartContainer and chartResponsive directly; a cross-import
// creates a circular module reference that makes ChartContainer evaluate as
// undefined at runtime. Keep CHART_DEFAULTS fully self-contained.

/**
 * CHART_DEFAULTS — per-type sizing & behaviour presets.
 *
 * Explicit props always win:  <ChartContainer type="bar" maxHeight={400} />
 * Add a new chart:            <ChartContainer option={(w) => myFn(data, w)} type="bar" />
 * Override one value:         <ChartContainer type="pie" maxHeight={260} />
 *
 * square: true  → caps wrapper maxWidth at maxHeight so ResizeObserver feeds
 *                 width ≤ maxHeight; with ratio=1 height=width → square canvas.
 *                 Prevents horizontal stretching of pie / scatter on wide cards.
 * gl:     true  → hooks ZRender mousedown/mouseup to fire tooltip on mobile tap
 *                 (echarts-gl OrbitControl consumes normal click events).
 *
 * If you add a type here, mirror it in the CHART_TYPES block in chartResponsive.js.
 */
const MIN_CHART_HEIGHT = 180;

const CHART_DEFAULTS = {
  pie:     { ratio: 1,      maxHeight: 300, square: true,  gl: false },
  scatter: { ratio: 1,      maxHeight: 320, square: true,  gl: false },
  bar:     { ratio: 1,      maxHeight: 340, square: false, gl: false },
  treemap: { ratio: 1,      maxHeight: 360, square: false, gl: false },
  bubble:  { ratio: 1,      maxHeight: 380, square: false, gl: false },
  box:     { ratio: 1,      maxHeight: 360, square: false, gl: false },
  heatmap: { ratio: 1,      maxHeight: 360, square: false, gl: false },
  '3d':    { ratio: 0.75,   maxHeight: 430, square: false, gl: true  },
};

/**
 * ChartContainer — responsive ECharts wrapper.
 *
 * Props:
 *   option     — plain ECharts option object, OR (width, height) => option function
 *   type       — chart family key from CHART_DEFAULTS (sets ratio/maxHeight/square/gl)
 *   ratio      — explicit height/width ratio (overrides type default)
 *   maxHeight  — explicit max canvas height px (overrides type default)
 *   square     — explicit square-canvas flag (overrides type default)
 *   gl         — explicit GL tap-tooltip flag (overrides type default)
 *   opts       — passed to ReactECharts opts prop (e.g. { renderer: 'svg' })
 */
export default function ChartContainer({ option, type, ratio, maxHeight, opts = {}, square, gl }) {
  const td         = (type && CHART_DEFAULTS[type]) || {};
  const _ratio     = ratio     !== undefined ? ratio     : (td.ratio     ?? 9 / 16);
  const _maxHeight = maxHeight !== undefined ? maxHeight : (td.maxHeight ?? 400);
  const _square    = square    !== undefined ? square    : (td.square    ?? false);
  const _gl        = gl        !== undefined ? gl        : (td.gl        ?? false);
  const wrapRef  = useRef(null);
  const chartRef = useRef(null);
  const [dims, setDims] = useState({ width: 0, height: 240 });
  // React-rendered tooltip overlay for GL charts on mobile.
  // We bypass echarts-gl's internal tooltip (which requires a live pointer
  // position for its WebGL raycaster) and render the HTML ourselves.
  const [glTip, setGlTip] = useState(null); // { html, x, y, above }

  const compute = useCallback((width) => {
    if (!width) return undefined;
    const viewportCap = Math.floor(window.innerHeight * 0.65);
    return Math.max(Math.min(Math.round(width * _ratio), _maxHeight, viewportCap), MIN_CHART_HEIGHT);
  }, [_ratio, _maxHeight]);

  useEffect(() => {
    if (!wrapRef.current) return;
    const applyWidth = (width) => {
      const h = compute(width);
      if (h !== undefined) setDims({ width, height: h });
    };
    applyWidth(wrapRef.current.offsetWidth);
    const ro = new ResizeObserver((entries) => {
      applyWidth(entries[0]?.contentRect?.width);
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [compute]);

  // No explicit pixel args — let ECharts re-measure its own container via CSS
  useEffect(() => {
    const inst = chartRef.current?.getEchartsInstance?.();
    if (inst) inst.resize();
  }, [dims.height]);

  // GL mobile tooltip — React overlay approach
  // ─────────────────────────────────────────────────────────────────────────
  // Why every echarts-gl internal approach fails on mobile:
  //   • ZRender listeners: OrbitControl calls stopPropagation on the canvas,
  //     so ZRender never receives touch events.
  //   • Synthetic mousemove: browser always sets offsetX/Y=0 on synthetic
  //     events, so echarts-gl's WebGL raycaster always tests at (0,0).
  //   • dispatchAction({type:'showTip', x, y}): internally does a WebGL
  //     raycast from those screen coords — fails without a real pointer event.
  //   • dispatchAction({seriesIndex, dataIndex}): echarts-gl's tooltip handler
  //     still requires an active GL pointer context to render — shows nothing.
  //
  // Solution: bypass echarts-gl's tooltip entirely on mobile.
  //   1. Capture touchstart/touchend at container level (capture:true fires
  //      before OrbitControl's canvas handlers can stopPropagation).
  //   2. On tap, project every data point through convertToPixel (echarts-gl
  //      implements Grid3D.dataToPoint which gives accurate 2D screen coords).
  //   3. Find the nearest projected point to the tap in screen space.
  //   4. Call the chart's own formatter function with that point's params.
  //   5. Render the returned HTML in a React <div> overlay — no WebGL needed.
  //
  // Desktop hover tooltips are unaffected (they still use mousemove natively).
  useEffect(() => {
    if (!_gl || !wrapRef.current) return;
    const container = wrapRef.current;

    let touchX = 0, touchY = 0, touchT = 0;

    const onTouchStart = (e) => {
      setGlTip(null); // clear previous tip on new touch
      const t = e.touches[0];
      if (!t) return;
      touchX = t.clientX; touchY = t.clientY; touchT = Date.now();
    };

    const onTouchEnd = (e) => {
      const t = e.changedTouches[0];
      if (!t) return;
      // Ignore drags — only act on taps (< 14px movement, < 300ms)
      if (Math.abs(t.clientX - touchX) > 14 || Math.abs(t.clientY - touchY) > 14) return;
      if (Date.now() - touchT > 300) return;

      const inst = chartRef.current?.getEchartsInstance?.();
      if (!inst) return;

      const rect = container.getBoundingClientRect();
      const tapX = t.clientX - rect.left;
      const tapY = t.clientY - rect.top;

      // Project every 3D data point to 2D screen space using echarts-gl's own
      // Grid3D.dataToPoint (accessed via inst.convertToPixel).
      let bestSi = -1, bestDi = -1, bestDist = Infinity;
      try {
        const opt = inst.getOption();
        (opt?.series || []).forEach((s, si) => {
          (s.data || []).forEach((item, di) => {
            const raw = Array.isArray(item?.value) ? item.value : (Array.isArray(item) ? item : null);
            if (!raw || raw.length < 3) return;
            let px = null;
            try { px = inst.convertToPixel({ grid3DIndex: 0 }, [raw[0], raw[1], raw[2]]); } catch (_) {}
            if (!Array.isArray(px)) {
              try { px = inst.convertToPixel({ seriesIndex: si }, [raw[0], raw[1], raw[2]]); } catch (_) {}
            }
            if (!Array.isArray(px) || px.length < 2) return;
            const d = (px[0] - tapX) ** 2 + (px[1] - tapY) ** 2;
            if (d < bestDist) { bestDist = d; bestSi = si; bestDi = di; }
          });
        });
      } catch (_) {}

      if (bestSi < 0) return;

      // Call the chart's formatter with the matched point's params.
      try {
        const opt    = inst.getOption();
        const s      = opt.series[bestSi];
        const item   = s.data[bestDi];
        const val    = Array.isArray(item?.value) ? item.value : (Array.isArray(item) ? item : []);
        const tt     = Array.isArray(opt.tooltip) ? opt.tooltip[0] : opt.tooltip;
        const fmt    = tt?.formatter;
        if (typeof fmt !== 'function') return;

        const html = fmt({
          value: val,
          seriesIndex: bestSi,
          dataIndex: bestDi,
          name: item?.name ?? val[3] ?? '',
          seriesName: s.name ?? '',
        });
        if (!html) return;

        // Position: above tap if in lower half, below if in upper half.
        // Clamp x so the box stays inside the chart width.
        const above = tapY > dims.height * 0.55;
        const x = Math.max(10, Math.min(tapX, dims.width - 10));
        setGlTip({ html, x, y: tapY, above });
      } catch (_) {}
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    container.addEventListener('touchend',   onTouchEnd,   { passive: true, capture: true });
    return () => {
      container.removeEventListener('touchstart', onTouchStart, { capture: true });
      container.removeEventListener('touchend',   onTouchEnd,   { capture: true });
    };
  }, [_gl, dims]);

  const resolvedOption = typeof option === 'function'
    ? option(dims.width, dims.height)
    : option;

  // Inject triggerOn for non-GL charts so tooltips respond to mobile tap.
  // ECharts default is 'mousemove' which doesn't fire on touch screens.
  // Per-chart configs can still override by setting their own triggerOn.
  const finalOption = (() => {
    if (_gl || !resolvedOption) return resolvedOption;
    const t = resolvedOption.tooltip;
    if (!t) return resolvedOption;
    const patch = tt => ({ triggerOn: 'mousemove|click', ...tt });
    return { ...resolvedOption, tooltip: Array.isArray(t) ? t.map(patch) : patch(t) };
  })();

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        height: dims.height,
        position: 'relative',
        // square: constrain width so ResizeObserver feeds ≤ _maxHeight
        // → compute() returns width itself → height = width → square canvas
        ...(_square && { maxWidth: _maxHeight + 'px', margin: '0 auto' }),
      }}
    >
      <ReactECharts
        ref={chartRef}
        option={finalOption}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas', ...opts }}
        notMerge
        lazyUpdate={false}
      />
      {/* React tooltip overlay for GL charts on mobile — rendered outside
          echarts-gl so it needs no WebGL raycasting to appear. */}
      {_gl && glTip && (
        <div
          style={{
            position: 'absolute',
            left: glTip.x,
            ...(glTip.above
              ? { bottom: dims.height - glTip.y + 10 }
              : { top: glTip.y + 10 }),
            transform: 'translateX(-50%)',
            background: 'rgba(13,7,24,0.97)',
            border: '1px solid rgba(212,168,67,0.32)',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#EDE0C4',
            fontSize: 11,
            lineHeight: 1.6,
            zIndex: 10,
            pointerEvents: 'none',
            maxWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            whiteSpace: 'nowrap',
          }}
          dangerouslySetInnerHTML={{ __html: glTip.html }}
        />
      )}
    </div>
  );
}
