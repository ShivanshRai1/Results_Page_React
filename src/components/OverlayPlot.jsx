import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useTheme } from './ThemeContext';

export const OverlayPlot = ({ data, visibleComponents, plotId = 'overlayPlot', height = 420 }) => {
  const containerRef = useRef(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    const tempTraces = data.components
      .filter((c) => visibleComponents.has(c.name))
      .map((c) => ({
        x: data.time,
        y: data.temps[c.name],
        type: 'scatter',
        mode: 'lines',
        name: `${c.name} — Tj`,
        line: { color: c.color, width: 2 },
        hovertemplate: 't=%{x:.2f}s<br>Tj=%{y:.2f}°C<extra></extra>',
      }));

    const powerTraces = data.components
      .filter((c) => visibleComponents.has(c.name))
      .map((c) => ({
        x: data.time,
        y: data.power[c.name],
        type: 'scatter',
        mode: 'lines',
        name: `${c.name} — P`,
        line: { color: c.color, width: 2, dash: 'dot' },
        hovertemplate: 't=%{x:.2f}s<br>P=%{y:.2f}W<extra></extra>',
        yaxis: 'y2',
        opacity: 0.9,
      }));

    const textColor = isDark ? '#ffffff' : '#000000';

    const layout = {
      margin: { l: 60, r: 60, t: 60, b: 40 },
      xaxis: { 
        title: 'Time (s)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
      },
      yaxis: { 
        title: 'Temperature (°C)',
        titlefont: { color: textColor },
        tickfont: { color: textColor },
      },
      yaxis2: { 
        title: 'Power (W)', 
        overlaying: 'y', 
        side: 'right', 
        showgrid: false,
        titlefont: { color: textColor },
        tickfont: { color: textColor },
      },
      legend: { 
        orientation: 'h', 
        y: 1.15, 
        xanchor: 'center', 
        x: 0.5,
        font: { color: textColor },
      },
      hoverlabel: {
        font: { color: '#000000' },
      },
      plot_bgcolor: 'transparent',
      paper_bgcolor: 'transparent',
      hovermode: 'x unified',
      height,
    };

    Plotly.newPlot(containerRef.current, [...tempTraces, ...powerTraces], layout, {
      displayModeBar: false,
      responsive: true,
    });

    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, visibleComponents, height, isDark]);

  return <div ref={containerRef} id={plotId} style={{ width: '100%', height: `${height}px` }} />;
};
