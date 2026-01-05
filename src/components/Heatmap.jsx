import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { minMax2D, fmt } from '../utils/helpers';
import { useTheme } from './ThemeContext';

export const Heatmap = ({ title, field, footprints, showOutlines, autoScale, plotId }) => {
  const containerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { isDark } = useTheme();
  const { min, max } = minMax2D(field);

  const handleReset = () => {
    if (containerRef.current) {
      Plotly.relayout(containerRef.current, {
        'xaxis.range': [0, 40],
        'yaxis.range': [0, 40],
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

    // When autoScale is true: use per-heatmap computed min/max (linear mapping, normal color grading).
    // When autoScale is false: use exaggerated color range to highlight hotspots (smaller effective range).
    const colorMin = autoScale ? min : (min + max) * 0.25;  // Exaggerated: shift min upward
    const colorMax = autoScale ? max : (min + max) * 0.85;  // Exaggerated: shift max downward

    const data = [
      {
        z: field,
        type: 'heatmap',
        colorscale: 'Inferno',
        showscale: true,
        zsmooth: false,
        zmin: colorMin,
        zmax: colorMax,
        colorbar: { title: '°C' },
      },
    ];

    const textColor = isDark ? '#ffffff' : '#000000';

    const layout = {
      margin: { l: 40, r: 60, t: 10, b: 40 },
      xaxis: { 
        title: 'x (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: [0, 40],
        dtick: 10,
        constrainaxis: 'range',
      },
      yaxis: { 
        title: 'y (mm)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
        range: [0, 40],
        dtick: 10,
        scaleanchor: 'x',
        scaleratio: 1,
        constrainaxis: 'range',
      },
      shapes,
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      // colorbar is set on the trace (zmin/zmax) so the numeric labels match the data
    };

    Plotly.newPlot(containerRef.current, data, layout, { 
      displayModeBar: false, 
      responsive: true,
      doubleClick: false  // Disable double-click zoom out
    });


    // Detect zoom events to show/hide tooltip and enforce axis limits
    const handleRelayout = (eventData) => {
      let reset = false;
      let update = {};
      // Check x axis
      if (
        eventData['xaxis.range[0]'] !== undefined &&
        (eventData['xaxis.range[0]'] < 0 || eventData['xaxis.range[1]'] > 40)
      ) {
        update['xaxis.range'] = [0, 40];
        reset = true;
      }
      // Check y axis
      if (
        eventData['yaxis.range[0]'] !== undefined &&
        (eventData['yaxis.range[0]'] < 0 || eventData['yaxis.range[1]'] > 40)
      ) {
        update['yaxis.range'] = [0, 40];
        reset = true;
      }
      if (reset && containerRef.current) {
        Plotly.relayout(containerRef.current, update);
      }
      // Tooltip logic (unchanged)
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
  }, [field, footprints, showOutlines, autoScale, isDark]);

  return (
    <div className="card span-4">
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
      >
        {isZoomed && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.8)',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              pointerEvents: 'none',
              zIndex: 100,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            }}
          >
            Click Reset to return to original view
          </div>
        )}
      </div>
    </div>
  );
};
