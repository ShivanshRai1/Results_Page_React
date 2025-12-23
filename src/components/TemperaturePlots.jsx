import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useTheme } from './ThemeContext';

export const TemperaturePlots = ({ data, visibleComponents, plotId = 'tempPlot' }) => {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  const baseHeight = 420;
  const plotHeight = baseHeight + 140;

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

    const textColor = isDark ? '#ffffff' : '#000000';

    const layout = {
      margin: { l: 50, r: 20, t: 10, b: 120 },
      xaxis: {
        title: 'Time (s)',
        titlefont: { color: textColor, size: 12 },
        tickfont: { color: textColor, size: 10 },
        rangeslider: { visible: true, thickness: 0.05 },
        range: [0, 45],
      },
      yaxis: {
        title: 'Temperature (°C)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
      },
      annotations: [
        {
          text: 'Drag range slider to explore full 600s',
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: -0.29,
          xanchor: 'center',
          yanchor: 'top',
          showarrow: false,
          font: { size: 10, color: isDark ? '#888888' : '#999999' },
        },
      ],
      legend: {
        font: { color: textColor },
      },
      hoverlabel: {
        font: { color: '#000000' },
      },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      hovermode: 'x unified',
    };

    layout.height = plotHeight;

    Plotly.newPlot(containerRef.current, plotData, layout, { displayModeBar: false, responsive: true });

    return () => {
      if (containerRef.current) Plotly.purge(containerRef.current);
    };
  }, [data, visibleComponents, isDark, plotHeight]);

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
      <div ref={containerRef} id={plotId} style={{ width: '100%', height: `${baseHeight + 140}px` }} />
    </div>
  );
};
