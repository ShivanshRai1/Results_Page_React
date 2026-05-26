import { useEffect, useRef, useState, useCallback } from 'react';
import Plotly from 'plotly.js-dist-min';
import { minMax2D, fmt } from '../utils/helpers';
import { useTheme } from './ThemeContext';

const MIN_PLOT_HEIGHT = 320;

function getPlotAspect(grid) {
  const bounds = getGridBounds(grid);
  const xSpan = Math.max(1, bounds.x[1] - bounds.x[0]);
  const ySpan = Math.max(1, bounds.y[1] - bounds.y[0]);
  return { xSpan, ySpan };
}

function getGridBounds(grid) {
  if (!grid) return { x: [0, 40], y: [0, 40] };
  return {
    x: [grid.x_min, grid.x_max],
    y: [grid.y_min, grid.y_max],
  };
}

function clampAxisRange(range, bounds) {
  const [boundMin, boundMax] = bounds;
  let [rangeMin, rangeMax] = range;
  if (rangeMin > rangeMax) {
    [rangeMin, rangeMax] = [rangeMax, rangeMin];
  }

  const span = rangeMax - rangeMin;
  const boundSpan = boundMax - boundMin;
  if (span >= boundSpan) {
    return [boundMin, boundMax];
  }

  if (rangeMin < boundMin) {
    rangeMax += boundMin - rangeMin;
    rangeMin = boundMin;
  }
  if (rangeMax > boundMax) {
    rangeMin -= rangeMax - boundMax;
    rangeMax = boundMax;
  }
  if (rangeMin < boundMin) {
    rangeMin = boundMin;
    rangeMax = Math.min(boundMax, rangeMin + span);
  }

  return [rangeMin, rangeMax];
}

function rangesNearlyEqual(a, b, tolerance = 0.05) {
  return Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;
}

function isZoomedIn(xRange, yRange, bounds) {
  return (
    !rangesNearlyEqual(xRange, bounds.x) ||
    !rangesNearlyEqual(yRange, bounds.y)
  );
}

async function applyAxisRanges(plotEl, xRange, yRange) {
  await Plotly.relayout(plotEl, { 'yaxis.scaleanchor': null });
  await Plotly.relayout(plotEl, {
    'xaxis.range': [xRange[0], xRange[1]],
    'yaxis.range': [yRange[0], yRange[1]],
    'xaxis.autorange': false,
    'yaxis.autorange': false,
    'yaxis.scaleanchor': 'x',
    'yaxis.scaleratio': 1,
    'xaxis.constrainaxis': 'range',
    'yaxis.constrainaxis': 'range',
  });
}

export const PCBHeatmaps = ({ title, field, footprints, showOutlines, autoScale, plotId, grid }) => {
  const containerRef = useRef(null);
  const clampingRef = useRef(false);
  const boundsRef = useRef(getGridBounds(grid));
  const validateRef = useRef(null);
  const relayoutHandlerRef = useRef(null);
  const validateTimerRef = useRef(null);
  const resizeTimerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { isDark } = useTheme();
  const { min, max } = minMax2D(field);
  const { xSpan, ySpan } = getPlotAspect(grid);

  const resetPlotView = useCallback(() => {
    const plotEl = containerRef.current;
    const validate = validateRef.current;
    if (!plotEl || !plotEl.layout || !validate) return;

    clampingRef.current = true;
    applyAxisRanges(plotEl, boundsRef.current.x, boundsRef.current.y)
      .then(() => validate(true))
      .finally(() => {
        clampingRef.current = false;
      });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const bounds = getGridBounds(grid);
    boundsRef.current = bounds;
    const xRange = bounds.x;
    const yRange = bounds.y;

    const shapes = showOutlines
      ? footprints.map((fp) => ({
          type: 'rect',
          xref: 'x',
          yref: 'y',
          x0: fp.x,
          x1: fp.x + fp.l,
          y0: fp.y,
          y1: fp.y + fp.w,
          line: { color: 'cyan', width: 2 },
          layer: 'above',
          fillcolor: 'rgba(0,0,0,0)',
        }))
      : [];

    const annotations = showOutlines
      ? footprints.map((fp) => ({
          x: fp.x + fp.l / 2,
          y: fp.y + fp.w / 2,
          text: fp.name,
          showarrow: false,
          font: {
            color: 'white',
            size: 10,
            family: 'monospace',
            weight: 'bold',
          },
          bgcolor: 'rgba(0, 0, 0, 0.6)',
          borderpad: 3,
          borderwidth: 0,
        }))
      : [];

    const colorMin = autoScale ? min : (min + max) * 0.25;
    const colorMax = autoScale ? max : (min + max) * 0.85;

    const thermalColorscale = [
      [0.0, '#0b0b2e'],
      [0.12, '#1f1172'],
      [0.28, '#5b1fa6'],
      [0.42, '#a4249f'],
      [0.58, '#e33b62'],
      [0.72, '#f07b3f'],
      [0.86, '#f7c844'],
      [1.0, '#fff1b0'],
    ];

    const textColor = isDark ? '#ffffff' : '#000000';
    const xSpan = xRange[1] - xRange[0];
    const dtick = Math.max(10, Math.round(xSpan / 5));

    const nx = field[0]?.length ?? 1;
    const ny = field.length ?? 1;
    const xDenom = Math.max(1, nx - 1);
    const yDenom = Math.max(1, ny - 1);
    const xCoords = Array.from({ length: nx }, (_, i) =>
      xRange[0] + (i / xDenom) * (xRange[1] - xRange[0])
    );
    const yCoords = Array.from({ length: ny }, (_, j) =>
      yRange[0] + (j / yDenom) * (yRange[1] - yRange[0])
    );

    const data = [
      {
        z: field,
        x: xCoords,
        y: yCoords,
        type: 'heatmap',
        colorscale: thermalColorscale,
        showscale: true,
        zsmooth: false,
        zmin: colorMin,
        zmax: colorMax,
        colorbar: { title: '°C' },
      },
    ];

    const layout = {
      margin: { l: 40, r: 60, t: 10, b: 40 },
      xaxis: {
        title: 'x (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: [...xRange],
        dtick: dtick,
        autorange: false,
        constrainaxis: 'range',
      },
      yaxis: {
        title: 'y (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: [...yRange],
        dtick: dtick,
        autorange: false,
        scaleanchor: 'x',
        scaleratio: 1,
        constrainaxis: 'range',
      },
      shapes,
      annotations,
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      dragmode: 'zoom',
    };

    const plotConfig = {
      displayModeBar: true,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
      responsive: true,
      doubleClick: 'reset',
      scrollZoom: false,
    };

    const plotEl = containerRef.current;

    const validateRanges = async (forceFullReset = false) => {
      if (clampingRef.current || !plotEl.layout?.xaxis?.range || !plotEl.layout?.yaxis?.range) {
        return;
      }

      const currentBounds = boundsRef.current;
      const xR = [...plotEl.layout.xaxis.range];
      const yR = [...plotEl.layout.yaxis.range];
      const fullXSpan = currentBounds.x[1] - currentBounds.x[0];
      const fullYSpan = currentBounds.y[1] - currentBounds.y[0];
      const xSpan = xR[1] - xR[0];
      const ySpan = yR[1] - yR[0];

      const zoomedOut = xSpan >= fullXSpan - 0.05 || ySpan >= fullYSpan - 0.05;
      const clampedX = clampAxisRange(xR, currentBounds.x);
      const clampedY = clampAxisRange(yR, currentBounds.y);
      const needsFullReset = forceFullReset || zoomedOut;
      const targetX = needsFullReset ? currentBounds.x : clampedX;
      const targetY = needsFullReset ? currentBounds.y : clampedY;

      if (!rangesNearlyEqual(xR, targetX) || !rangesNearlyEqual(yR, targetY)) {
        clampingRef.current = true;
        try {
          await applyAxisRanges(plotEl, targetX, targetY);
        } finally {
          clampingRef.current = false;
        }
        setIsZoomed(false);
        return;
      }

      setIsZoomed(isZoomedIn(xR, yR, currentBounds));
    };

    validateRef.current = validateRanges;

    const scheduleValidate = (forceFullReset = false) => {
      clearTimeout(validateTimerRef.current);
      validateTimerRef.current = setTimeout(() => {
        validateRanges(forceFullReset);
      }, 0);
    };

    const handleRelayout = (eventData) => {
      if (clampingRef.current) return;

      if (eventData['xaxis.autorange'] === true || eventData['yaxis.autorange'] === true) {
        scheduleValidate(true);
        return;
      }

      if (
        eventData['xaxis.range[0]'] !== undefined ||
        eventData['yaxis.range[0]'] !== undefined ||
        eventData['xaxis.range'] !== undefined ||
        eventData['yaxis.range'] !== undefined
      ) {
        scheduleValidate(false);
      }
    };

    relayoutHandlerRef.current = handleRelayout;

    Plotly.newPlot(plotEl, data, layout, plotConfig).then(async () => {
      if (typeof plotEl.on === 'function') {
        plotEl.on('plotly_relayout', handleRelayout);
      }
      await Plotly.Plots.resize(plotEl);
      clampingRef.current = true;
      await applyAxisRanges(plotEl, xRange, yRange);
    }).finally(() => {
      clampingRef.current = false;
      setIsZoomed(false);
    });

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          if (clampingRef.current || !plotEl.layout) return;
          clearTimeout(resizeTimerRef.current);
          resizeTimerRef.current = setTimeout(async () => {
            clampingRef.current = true;
            try {
              await Plotly.Plots.resize(plotEl);
              await applyAxisRanges(plotEl, boundsRef.current.x, boundsRef.current.y);
            } finally {
              clampingRef.current = false;
            }
          }, 120);
        })
      : null;

    resizeObserver?.observe(plotEl);

    return () => {
      clearTimeout(validateTimerRef.current);
      clearTimeout(resizeTimerRef.current);
      resizeObserver?.disconnect();
      validateRef.current = null;
      const handler = relayoutHandlerRef.current;
      relayoutHandlerRef.current = null;
      if (typeof plotEl.removeAllListeners === 'function') {
        plotEl.removeAllListeners('plotly_relayout');
      } else if (typeof plotEl.removeListener === 'function' && handler) {
        plotEl.removeListener('plotly_relayout', handler);
      }
      Plotly.purge(plotEl);
    };
  }, [field, footprints, showOutlines, autoScale, isDark, grid, min, max]);

  return (
    <div className="card span-12">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <div className="meta">
            min {fmt(min)}°C · max {fmt(max)}°C
          </div>
        </div>
        <button
          type="button"
          onClick={resetPlotView}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            background: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.2)',
            borderRadius: '4px',
            color: isDark ? '#fff' : '#000',
            transition: 'all 0.2s',
            boxShadow: isDark ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}
          onMouseEnter={(e) => {
            e.target.style.background = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
          }}
        >
          Reset
        </button>
      </div>
      <div
        ref={containerRef}
        id={plotId}
        style={{
          width: '100%',
          aspectRatio: `${xSpan} / ${ySpan}`,
          minHeight: MIN_PLOT_HEIGHT,
          position: 'relative',
        }}
      />
      {isZoomed && (
        <div
          style={{
            marginTop: '6px',
            fontSize: '12px',
            fontWeight: '500',
            color: isDark ? '#cbd5e1' : '#334155',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          Zoom active — click Reset to return
        </div>
      )}
    </div>
  );
};
