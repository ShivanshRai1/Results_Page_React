import { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { minMax2D, fmt } from '../utils/helpers';

export const Heatmap = ({ title, field, footprints, showOutlines, autoScale, plotId }) => {
  const containerRef = useRef(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const { min, max } = minMax2D(field);

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

    const layout = {
      margin: { l: 40, r: 60, t: 10, b: 40 },
      xaxis: { title: 'x (mm)' },
      yaxis: { title: 'y (mm)' },
      shapes,
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      // colorbar is set on the trace (zmin/zmax) so the numeric labels match the data
    };

    Plotly.newPlot(containerRef.current, data, layout, { displayModeBar: false, responsive: true });

    // Detect zoom events to show/hide tooltip
    const handleRelayout = (eventData) => {
      if (eventData['xaxis.autorange'] === true || eventData['yaxis.autorange'] === true) {
        // User double-clicked to reset zoom
        setIsZoomed(false);
      } else if (eventData['xaxis.range[0]'] !== undefined || eventData['yaxis.range[0]'] !== undefined) {
        // User zoomed in
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
  }, [field, footprints, showOutlines, autoScale]);

  return (
    <div className="card span-4">
      <div className="card-header">
        <div>
          <h2>{title}</h2>
          <div className="meta">
            min {fmt(min)}°C · max {fmt(max)}°C
          </div>
        </div>
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
            Double-click to reset view
          </div>
        )}
      </div>
    </div>
  );
};
