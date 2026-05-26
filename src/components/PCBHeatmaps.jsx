import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { minMax2D, fmt } from '../utils/helpers';
import { useTheme } from './ThemeContext';

const DEFAULT_BOUNDS = { x: [0, 40], y: [0, 40] };

function getGridBounds(grid) {
  if (!grid) return DEFAULT_BOUNDS;
  return {
    x: [grid.x_min, grid.x_max],
    y: [grid.y_min, grid.y_max],
  };
}

function readAxisRange(eventData, axisKey) {
  const start = eventData[`${axisKey}.range[0]`];
  const end = eventData[`${axisKey}.range[1]`];
  if (start !== undefined && end !== undefined) {
    return [Number(start), Number(end)];
  }
  const range = eventData[`${axisKey}.range`];
  if (Array.isArray(range) && range.length === 2) {
    return [Number(range[0]), Number(range[1])];
  }
  return null;
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

function rangesNearlyEqual(a, b, tolerance = 0.01) {
  return Math.abs(a[0] - b[0]) <= tolerance && Math.abs(a[1] - b[1]) <= tolerance;
}

function isZoomedIn(xRange, yRange, bounds) {
  return (
    !rangesNearlyEqual(xRange, bounds.x) ||
    !rangesNearlyEqual(yRange, bounds.y)
  );
}

export const PCBHeatmaps = ({ title, field, footprints, showOutlines, autoScale, plotId, grid }) => {
  const containerRef = useRef(null);
  const clampingRef = useRef(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const { isDark } = useTheme();
  const { min, max } = minMax2D(field);

  const handleReset = () => {
    if (!containerRef.current) return;
    const bounds = getGridBounds(grid);
    Plotly.relayout(containerRef.current, {
      'xaxis.range': bounds.x,
      'yaxis.range': bounds.y,
      'xaxis.autorange': false,
      'yaxis.autorange': false,
    });
    setIsZoomed(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const bounds = getGridBounds(grid);
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

    // Map each grid cell index to physical mm so shapes/annotations align
    const nx = field[0]?.length ?? 1;
    const ny = field.length ?? 1;
    const xCoords = Array.from({ length: nx }, (_, i) =>
      nx > 1 ? xRange[0] + (i / (nx - 1)) * (xRange[1] - xRange[0]) : xRange[0]
    );
    const yCoords = Array.from({ length: ny }, (_, j) =>
      ny > 1 ? yRange[0] + (j / (ny - 1)) * (yRange[1] - yRange[0]) : yRange[0]
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
        range: xRange,
        dtick: dtick,
        autorange: false,
        constrainaxis: 'range',
      },
      yaxis: {
        title: 'y (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: yRange,
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

    const plotEl = containerRef.current;

    Plotly.newPlot(plotEl, data, layout, {
      displayModeBar: true,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
      responsive: true,
      doubleClick: 'reset',
      scrollZoom: false,
    }).then(() => {
      clampingRef.current = true;
      return Plotly.relayout(plotEl, {
        'xaxis.range': xRange,
        'yaxis.range': yRange,
        'xaxis.autorange': false,
        'yaxis.autorange': false,
      });
    }).finally(() => {
      clampingRef.current = false;
    });

    const applyClampedRanges = (nextX, nextY) => {
      clampingRef.current = true;
      Plotly.relayout(plotEl, {
        'xaxis.range': nextX,
        'yaxis.range': nextY,
        'xaxis.autorange': false,
        'yaxis.autorange': false,
      }).finally(() => {
        clampingRef.current = false;
      });
    };

    const handleRelayout = (eventData) => {
      if (clampingRef.current) return;

      if (eventData['xaxis.autorange'] === true || eventData['yaxis.autorange'] === true) {
        applyClampedRanges(bounds.x, bounds.y);
        setIsZoomed(false);
        return;
      }

      const layoutSnapshot = plotEl.layout;
      let nextX = readAxisRange(eventData, 'xaxis');
      let nextY = readAxisRange(eventData, 'yaxis');

      if (!nextX && layoutSnapshot?.xaxis?.range) {
        nextX = [...layoutSnapshot.xaxis.range];
      }
      if (!nextY && layoutSnapshot?.yaxis?.range) {
        nextY = [...layoutSnapshot.yaxis.range];
      }
      if (!nextX || !nextY) return;

      const clampedX = clampAxisRange(nextX, bounds.x);
      const clampedY = clampAxisRange(nextY, bounds.y);

      if (!rangesNearlyEqual(clampedX, nextX) || !rangesNearlyEqual(clampedY, nextY)) {
        applyClampedRanges(clampedX, clampedY);
      }

      setIsZoomed(isZoomedIn(clampedX, clampedY, bounds));
    };

    plotEl.on('plotly_relayout', handleRelayout);

    return () => {
      plotEl.removeAllListeners('plotly_relayout');
      Plotly.purge(plotEl);
    };
  }, [field, footprints, showOutlines, autoScale, isDark, grid]);

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
          onClick={handleReset}
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
        style={{ width: '100%', height: '360px', position: 'relative' }}
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
