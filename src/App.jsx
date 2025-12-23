import { useState } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Heatmap } from './components/Heatmap';
import { TemperaturePlots } from './components/TemperaturePlots';
import { PowerPlots } from './components/PowerPlots';
import { OverlayPlot } from './components/OverlayPlot';
import { Checks } from './components/Checks';
import { generateDemoData } from './utils/demoData';
import { exportAllCsvs } from './utils/exportCsvs';

const config = {
  checks: {
    steadyPctMax: 5,
    energyPctMax: 2,
    capWarnPct: 25,
  },
};

function AppContent() {
  const [data] = useState(() => generateDemoData());
  const [activeTab, setActiveTab] = useState('heatmaps');
  const [showOutlines, setShowOutlines] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  const [visibleComponents, setVisibleComponents] = useState(
    new Set(data.components.map((c) => c.name))
  );
  const [showOverlay, setShowOverlay] = useState(false);

  const toggleComponent = (name) => {
    const newSet = new Set(visibleComponents);
    if (newSet.has(name)) {
      newSet.delete(name);
    } else {
      newSet.add(name);
    }
    setVisibleComponents(newSet);
  };

  const handleExport = () => {
    exportAllCsvs(data);
  };

  return (
    <div className="app">
      <Header passedChecks={3} totalChecks={4} onExport={handleExport} />

      <div className="layout">
        <Sidebar
          data={data}
          onToggleOutline={setShowOutlines}
          onToggleAutoScale={setAutoScale}
          onToggleComponent={toggleComponent}
        />

        <main>
          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 'heatmaps' ? 'active' : ''}`}
              onClick={() => {
                console.log('Clicked Heatmaps');
                setActiveTab('heatmaps');
              }}
              role="tab"
              aria-selected={activeTab === 'heatmaps'}
            >
              Heatmaps
            </button>
            <button
              className={`tab ${activeTab === 'temp' ? 'active' : ''}`}
              onClick={() => {
                console.log('Clicked Temperature Plots');
                setActiveTab('temp');
              }}
              role="tab"
              aria-selected={activeTab === 'temp'}
            >
              Temperature Plots
            </button>
            <button
              className={`tab ${activeTab === 'power' ? 'active' : ''}`}
              onClick={() => {
                console.log('Clicked Power Plots');
                setActiveTab('power');
              }}
              role="tab"
              aria-selected={activeTab === 'power'}
            >
              Power Plots
            </button>
            <button
              className={`tab ${activeTab === 'checks' ? 'active' : ''}`}
              onClick={() => {
                console.log('Clicked Sanity Checks');
                setActiveTab('checks');
              }}
              role="tab"
              aria-selected={activeTab === 'checks'}
            >
              Sanity Checks
            </button>
          </div>

          {/* Heatmaps Panel */}
          {activeTab === 'heatmaps' && (
            <section className="panel active">
              <div className="cards">
                <Heatmap
                  title="Top Surface Heatmap"
                  field={data.fields.top}
                  footprints={data.footprints}
                  showOutlines={showOutlines}
                  autoScale={autoScale}
                  plotId="heatmapTop"
                />
                <Heatmap
                  title="Bottom Surface Heatmap"
                  field={data.fields.bottom}
                  footprints={data.footprints}
                  showOutlines={showOutlines}
                  autoScale={autoScale}
                  plotId="heatmapBottom"
                />
                <Heatmap
                  title="Average (Weighted) Heatmap"
                  field={data.fields.avg}
                  footprints={data.footprints}
                  showOutlines={showOutlines}
                  autoScale={autoScale}
                  plotId="heatmapAvg"
                />
              </div>
            </section>
          )}

          {/* Temperature Plots Panel */}
          {activeTab === 'temp' && (
            <section className="panel active">
              <div className="cards">
                <TemperaturePlots data={data} visibleComponents={visibleComponents} plotId="tempPlot" />
                <div className="card span-12">
                  <div className="card-header">
                    <div>
                      <h2>Overlay: Temperature & Power</h2>
                      <div className="meta">Optional combined view with dual y-axes (°C and W). Use the toggle to show/hide.</div>
                    </div>
                    <div className="toolbar">
                      <button
                        className="btn"
                        onClick={() => setShowOverlay(!showOverlay)}
                      >
                        {showOverlay ? 'Hide Overlay' : 'Show Overlay'}
                      </button>
                    </div>
                  </div>
                  {showOverlay && (
                    <OverlayPlot data={data} visibleComponents={visibleComponents} plotId="overlayPlot" />
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Power Plots Panel */}
          {activeTab === 'power' && (
            <section className="panel active">
              <div className="cards">
                <PowerPlots data={data} visibleComponents={visibleComponents} plotId="powerPlot" />
              </div>
            </section>
          )}

          {/* Checks Panel */}
          {activeTab === 'checks' && (
            <section className="panel active">
              <div className="cards">
                <Checks data={data} config={config.checks} />
              </div>
            </section>
          )}
        </main>
      </div>

      <footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
