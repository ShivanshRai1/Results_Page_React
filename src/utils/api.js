// API client for thermal simulation backend

const API_BASE_URL = 'https://results-page-backend.onrender.com/api';

/**
 * Check if backend server is running
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error('Backend server is not responding');
  }
  return response.json();
}

/**
 * Run simulation with default parameters
 */
export async function runDefaultSimulation() {
  console.log('[THERMAL API] Fetching simulation data from backend...');
  const response = await fetch(`${API_BASE_URL}/simulate/default`);
  if (!response.ok) {
    const error = await response.json();
    console.error('[THERMAL API] Backend request failed:', error);
    throw new Error(error.detail || 'Simulation failed');
  }
  console.log('[THERMAL API] ✅ Successfully received DYNAMIC data from backend');
  return response.json();
}

/**
 * Run simulation with custom parameters
 */
export async function runSimulation(params) {
  const response = await fetch(`${API_BASE_URL}/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Simulation failed');
  }
  
  return response.json();
}

/**
 * Transform backend data to match frontend format
 */
export function transformBackendData(backendData) {
  const { grid, fields, time, components, meta } = backendData;
  
  // Create component list with colors
  const colors = ['#4f46e5', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
  const componentsFormatted = components.map((comp, idx) => ({
    name: comp.name,
    color: colors[idx % colors.length],
  }));
  
  // Create power object
  const power = {};
  components.forEach(comp => {
    power[comp.name] = comp.power;
  });
  
  // Create temps object
  const temps = {};
  components.forEach(comp => {
    temps[comp.name] = comp.temps;
  });
  
  // Create cases object
  const cases = {};
  components.forEach(comp => {
    cases[comp.name] = comp.cases;
  });
  
  // Create footprints
  const footprints = components.map(comp => ({
    name: comp.name,
    x: comp.position.x,
    y: comp.position.y,
    l: comp.dimensions.l,
    w: comp.dimensions.w,
  }));
  
  return {
    grid: {
      nx: grid.nx,
      ny: grid.ny,
      dx: grid.dx,
      dy: grid.dy,
    },
    fields: {
      top: fields.top,
      bottom: fields.bottom,
      avg: fields.avg,
    },
    time,
    power,
    temps,
    cases,
    components: componentsFormatted,
    footprints,
    meta: {
      ambient: meta.ambient,
      simTime: meta.simTime,
    },
  };
}
