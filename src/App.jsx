import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
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
  const [showOutlines, setShowOutlines] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  const [visibleComponents, setVisibleComponents] = useState(
    new Set(data.components.map((c) => c.name))
  );
  const [showOverlay, setShowOverlay] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('power')) return 'power';
    if (path.includes('temp')) return 'temp';
    if (path.includes('heatmaps')) return 'heatmaps';
    if (path.includes('checks')) return 'checks';
    return 'checks'; // default
  };

  const activeTab = getActiveTabFromPath();

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
            <Link
              to="/power"
              className={`tab ${activeTab === 'power' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'power'}
              onClick={(e) => {
                navigate('/power');
              }}
            >
              Power vs time
            </Link>
            <Link
              to="/temp"
              className={`tab ${activeTab === 'temp' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'temp'}
              onClick={(e) => {
                navigate('/temp');
              }}
            >
              Junction/Case temperature vs time
            </Link>
            <Link
              to="/heatmaps"
              className={`tab ${activeTab === 'heatmaps' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'heatmaps'}
              onClick={(e) => {
                navigate('/heatmaps');
              }}
            >
              PCB heatmaps
            </Link>
            <Link
              to="/checks"
              className={`tab ${activeTab === 'checks' ? 'active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'checks'}
              onClick={(e) => {
                navigate('/checks');
              }}
            >
              Sanity checks
            </Link>
          </div>

          {/* Tab Descriptions */}
          <div style={{ 
            padding: '12px 0', 
            fontSize: '14px', 
            color: 'var(--muted)',
            borderBottom: '1px solid var(--border)',
            marginBottom: '20px'
          }}>
            {activeTab === 'power' && 'Power dissipation and energy consumption metrics for each component over time'}
            {activeTab === 'temp' && 'Junction/case temperature profiles for all components over time'}
            {activeTab === 'heatmaps' && 'Spatial temperature distribution across PCB surfaces showing hotspots and thermal gradients'}
            {activeTab === 'checks' && 'Validation checks for thermal steady-state, energy conservation, and component ratings'}
          </div>

          {/* Heatmaps Panel */}
          <Routes>
            <Route path="/power" element={
              <section className="panel active">
                <div className="cards">
                  <PowerPlots data={data} visibleComponents={visibleComponents} plotId="powerPlot" />
                </div>
              </section>
            } />
            <Route path="/temp" element={
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
            } />
            <Route path="/heatmaps" element={
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
            } />
            <Route path="/checks" element={
              <section className="panel active">
                <div className="cards">
                  <Checks data={data} config={config.checks} />
                </div>
              </section>
            } />
            <Route path="*" element={
              <section className="panel active">
                <div className="cards">
                  <Checks data={data} config={config.checks} />
                </div>
              </section>
            } />
          </Routes>
        </main>
      </div>

      <footer />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
