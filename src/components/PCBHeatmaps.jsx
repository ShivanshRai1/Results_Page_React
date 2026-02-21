import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { minMax2D, fmt } from '../utils/helpers';
import { useTheme } from './ThemeContext';

export const PCBHeatmaps = ({ title, field, footprints, showOutlines, autoScale, plotId, grid }) => {
  const containerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { isDark } = useTheme();
  const { min, max } = minMax2D(field);

  const handleReset = () => {
    if (containerRef.current) {
      Plotly.relayout(containerRef.current, {
        'xaxis.autorange': true,
        'yaxis.autorange': true,
      });
      setIsZoomed(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

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

    const data = [
      {
        z: field,
        type: 'heatmap',
        colorscale: thermalColorscale,
        showscale: true,
        zsmooth: false,
        zmin: colorMin,
        zmax: colorMax,
        colorbar: { title: '°C' },
      },
    ];

    const textColor = isDark ? '#ffffff' : '#000000';

    const xRange = grid ? [grid.x_min, grid.x_max] : [0, 40];
    const yRange = grid ? [grid.y_min, grid.y_max] : [0, 40];
    const xSpan = xRange[1] - xRange[0];
    const dtick = Math.max(10, Math.round(xSpan / 5));

    const layout = {
      margin: { l: 40, r: 60, t: 10, b: 40 },
      xaxis: {
        title: 'x (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: xRange,
        dtick: dtick,
        constrainaxis: 'range',
      },
      yaxis: {
        title: 'y (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: yRange,
        dtick: dtick,
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

    Plotly.newPlot(containerRef.current, data, layout, {
      displayModeBar: true,
      modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'lasso2d', 'select2d'],
      responsive: true,
      doubleClick: 'reset',
      scrollZoom: true,
    });

    const handleRelayout = (eventData) => {
      const xRange = grid ? [grid.x_min, grid.x_max] : [0, 40];
      const yRange = grid ? [grid.y_min, grid.y_max] : [0, 40];
      let reset = false;
      let update = {};
      if (
        eventData['xaxis.range[0]'] !== undefined &&
        (eventData['xaxis.range[0]'] < xRange[0] || eventData['xaxis.range[1]'] > xRange[1])
      ) {
        update['xaxis.range'] = xRange;
        reset = true;
      }
      if (
        eventData['yaxis.range[0]'] !== undefined &&
        (eventData['yaxis.range[0]'] < yRange[0] || eventData['yaxis.range[1]'] > yRange[1])
      ) {
        update['yaxis.range'] = yRange;
        reset = true;
      }
      if (reset && containerRef.current) {
        Plotly.relayout(containerRef.current, update);
      }
      if (eventData['xaxis.autorange'] === true || eventData['yaxis.autorange'] === true) {
        setIsZoomed(false);
      } else if (eventData['xaxis.range[0]'] !== undefined || eventData['yaxis.range[0]'] !== undefined) {
        setIsZoomed(true);
      }
    };

    if (containerRef.current) {
      containerRef.current.on('plotly_relayout', handleRelayout);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeAllListeners('plotly_relayout');
        Plotly.purge(containerRef.current);
      }
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
