import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export const TemperaturePlots = ({ data, visibleComponents, plotId = 'tempPlot' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const plotData = data.components
      .filter((c) => visibleComponents.has(c.name))
      .flatMap((c) => [
        {
          x: data.time,
          y: data.temps[c.name],
          type: 'scatter',
          mode: 'lines',
          name: `${c.name} — Tj`,
          line: { color: c.color, width: 2 },
          hovertemplate: 't=%{x:.2f}s<br>Tj=%{y:.2f}°C<extra></extra>',
        },
        {
          x: data.time,
          y: data.cases[c.name],
          type: 'scatter',
          mode: 'lines',
          name: `${c.name} — Tc`,
          line: { color: c.color, width: 2, dash: 'dash' },
          hovertemplate: 't=%{x:.2f}s<br>Tc=%{y:.2f}°C<extra></extra>',
        },
      ]);

    const layout = {
      margin: { l: 50, r: 20, t: 10, b: 40 },
      xaxis: { title: 'Time (s)' },
      yaxis: { title: 'Temperature (°C)' },
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
          <h2>Temperature vs Time</h2>
          <div className="meta">Per-component junction & case curves. Click legends to toggle.</div>
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
      <div ref={containerRef} id={plotId} style={{ width: '100%', height: '420px' }} />
    </div>
  );
};
