import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useTheme } from './ThemeContext';

export const PowerPlots = ({ data, visibleComponents, plotId = 'powerPlot' }) => {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  const baseHeight = 360;
  const plotHeight = baseHeight + 140; // extra room for rangeslider + annotation

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
        title: 'Power (W)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
      },
      annotations: [
        {
          text: 'Drag range slider to explore full 600s',
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: -0.35,
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
      <div ref={containerRef} id={plotId} style={{ width: '100%', height: `${baseHeight + 140}px` }} />
    </div>
  );
};
