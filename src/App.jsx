import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { PCBHeatmaps } from './components/PCBHeatmaps';
import { JunctionCaseTemperature } from './components/JunctionCaseTemperature';
import { PowerVsTime } from './components/PowerVsTime';
import { OverlayPlot } from './components/OverlayPlot';
import { Checks } from './components/Checks';
import { generateDemoData } from './utils/demoData';
import { exportAllCsvs } from './utils/exportCsvs';
import { runDefaultSimulation, runSimulationFromUrlPayload, transformBackendData } from './utils/api';
import { parseUrlToSimulationPayload } from './utils/urlParams';
import { computeSanityChecks } from './utils/checksLogic';

const config = {
  checks: {
    steadyPctMax: 5,
    energyPctMax: 2,
    capWarnPct: 25,
  },
};

function AppContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [useDemoData, setUseDemoData] = useState(false);
  const [showOutlines, setShowOutlines] = useState(true);
  const [autoScale, setAutoScale] = useState(true);
  const [visibleComponents, setVisibleComponents] = useState(new Set());
  const [showOverlay, setShowOverlay] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [useDemoData]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let loadedData;
      
      if (useDemoData) {
        console.log('[THERMAL] Using STATIC demo data');
        loadedData = generateDemoData();
      } else {
        // If URL contains parameters, run custom simulation; otherwise run default
        const urlPayload = parseUrlToSimulationPayload();
        if (urlPayload) {
          console.log('[URL SIM] Detected URL parameters; running custom simulation');
          const backendData = await runSimulationFromUrlPayload(urlPayload);
          loadedData = transformBackendData(backendData);
          console.log('[URL SIM] ✅ Loaded simulation from URL payload');
        } else {
          const backendData = await runDefaultSimulation();
          loadedData = transformBackendData(backendData);
          console.log('[THERMAL] ✅ Successfully loaded DYNAMIC data from backend');
        }
      }
      
      setData(loadedData);
      setVisibleComponents(new Set(loadedData.components.map((c) => c.name)));
    } catch (err) {
      console.error('[THERMAL] ❌ Dynamic data failed, falling back to STATIC demo data:', err.message);
      setError(err.message);
      // Fallback to demo data on error
      const fallbackData = generateDemoData();
      setData(fallbackData);
      setVisibleComponents(new Set(fallbackData.components.map((c) => c.name)));
      setUseDemoData(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSimulation = () => {
    loadData();
  };

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
    if (data) {
      exportAllCsvs(data);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="app">
        <Header passedChecks={0} totalChecks={4} onExport={handleExport} />
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div style={{ fontSize: '18px', color: 'var(--muted)' }}>
            Running thermal simulation...
          </div>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid var(--border)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !data) {
    return (
      <div className="app">
        <Header passedChecks={0} totalChecks={4} onExport={handleExport} />
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '80vh',
          flexDirection: 'column',
          gap: '20px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '18px', color: 'var(--error)', textAlign: 'center' }}>
            Failed to load simulation data
          </div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', textAlign: 'center' }}>
            {error}
          </div>
          <button className="btn" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Calculate passed checks dynamically (ok + warn count as passing, only bad fails)
  const { passedCount, totalCount } = computeSanityChecks(data, config.checks);

  return (
    <div className="app">
      <Header passedChecks={passedCount} totalChecks={totalCount} onExport={handleExport} />

      {/* Error banner if using fallback data */}
      {error && useDemoData && (
        <div style={{
          background: '#fef3c7',
          color: '#92400e',
          padding: '12px 20px',
          borderBottom: '1px solid #fbbf24',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <span>⚠️ Backend unavailable. Showing demo data. Error: {error}</span>
          <button 
            className="btn"
            onClick={() => setUseDemoData(false)}
            style={{ fontSize: '13px', padding: '4px 12px' }}
          >
            Retry Backend
          </button>
        </div>
      )}

      <div className="layout">
        <Sidebar
          data={data}
          onToggleOutline={setShowOutlines}
          onToggleAutoScale={setAutoScale}
          onToggleComponent={toggleComponent}
          onRunSimulation={handleRunSimulation}
          useDemoData={useDemoData}
          onToggleDemoData={setUseDemoData}
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
                  <PowerVsTime data={data} visibleComponents={visibleComponents} plotId="powerPlot" />
                </div>
              </section>
            } />
            <Route path="/temp" element={
              <section className="panel active">
                <div className="cards">
                  <JunctionCaseTemperature data={data} visibleComponents={visibleComponents} plotId="tempPlot" />
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
                  <PCBHeatmaps
                    title="Top Surface Heatmap"
                    field={data.fields.top}
                    footprints={data.footprints}
                    showOutlines={showOutlines}
                    autoScale={autoScale}
                    plotId="heatmapTop"
                    grid={data.grid}
                  />
                  <PCBHeatmaps
                    title="Bottom Surface Heatmap"
                    field={data.fields.bottom}
                    footprints={data.footprints}
                    showOutlines={showOutlines}
                    autoScale={autoScale}
                    plotId="heatmapBottom"
                    grid={data.grid}
                  />
                  <PCBHeatmaps
                    title="Average (Weighted) Heatmap"
                    field={data.fields.avg}
                    footprints={data.footprints}
                    showOutlines={showOutlines}
                    autoScale={autoScale}
                    plotId="heatmapAvg"
                    grid={data.grid}
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
