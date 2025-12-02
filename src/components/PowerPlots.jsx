import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export const PowerPlots = ({ data, visibleComponents, plotId = 'powerPlot' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const plotData = data.components
      .filter((c) => visibleComponents.has(c.name))
      .map((c) => ({
        x: data.time,
        y: data.power[c.name],
        type: 'scatter',
        mode: 'lines',
        name: c.name,
        line: { color: c.color, width: 2 },
        hovertemplate: 't=%{x:.2f}s<br>P=%{y:.2f}W<extra></extra>',
      }));

    const layout = {
      margin: { l: 50, r: 20, t: 10, b: 40 },
      xaxis: { title: 'Time (s)' },
      yaxis: { title: 'Power (W)' },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      hovermode: 'x unified',
    };

    Plotly.newPlot(containerRef.current, plotData, layout, { displayModeBar: false, responsive: true });

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, visibleComponents]);

  return (
    <div className="card span-12">
      <div className="card-header">
        <div>
          <h2>Power vs Time</h2>
          <div className="meta">Input power profiles for each component.</div>
        </div>
        <div className="legend">
          {data.components.map((c) => (
            <span key={c.name}>
              <span className="swatch" style={{ background: c.color }}></span>
              {c.name}
            </span>
          ))}
        </div>
      </div>
      <div ref={containerRef} id={plotId} style={{ width: '100%', height: '360px' }} />
    </div>
  );
};
