// Parse URL query parameters into a backend-ready SimulationRequest payload
// Safe, non-intrusive: returns null if no recognizable params are found

function getAll(query, key) {
  const values = query.getAll(key);
  return values.length ? values : null;
}

function toFloat(v, fallback = undefined) {
  if (v === undefined || v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function decodeArrayParam(raw) {
  try {
    // raw is urlencoded JSON array of component tuples
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Map power object from URL {type,value} into backend format {power_type, power_params}
function mapPower(urlPower) {
  if (!urlPower || typeof urlPower !== 'object') {
    return { power_type: 'constant', power_params: { power: 1 } };
  }
  const type = urlPower.type || 'constant';
  if (type === 'constant') {
    return { power_type: 'constant', power_params: { power: toFloat(urlPower.value, 1) } };
  }
  // You can extend mappings for square_pulse/sinusoidal/parabolic when needed
  return { power_type: 'constant', power_params: { power: toFloat(urlPower.value, 1) } };
}

export function parseUrlToSimulationPayload(locationSearch = window.location.search) {
  const search = new URLSearchParams(locationSearch);

  // If neither array nor component ids exist, bail out
  const arrayParam = search.get('array');
  const idList = getAll(search, 'id[]');
  const hasParams = arrayParam || idList;
  if (!hasParams) return null;

  // Simulation/global defaults
  const ambient = toFloat(search.get('T_AMBIENT'), 25.0);
  const simTime = toFloat(search.get('T_MAX'), 100.0);
  
  // PCB material and geometry parameters with defaults
  const gridDx = toFloat(search.get('grid_dx'), 1.0);
  const gridDy = toFloat(search.get('grid_dy'), 1.0);
  const pcbK = toFloat(search.get('pcb_k'), 0.9);
  const pcbC = toFloat(search.get('pcb_c'), 1100);
  const pcbRho = toFloat(search.get('pcb_rho'), 1800);
  const pcbThickness = toFloat(search.get('pcb_thickness'), 1.6);
  const ambientHTop = toFloat(search.get('ambient_h_top'), 5.0);
  const ambientHBottom = toFloat(search.get('ambient_h_bottom'), 5.0);
  const margin = toFloat(search.get('margin'), 10);

  const payload = {
    ambient_temp: ambient,
    simulation_time: simTime,
    grid_dx: gridDx,
    grid_dy: gridDy,
    pcb_k: pcbK,
    pcb_c: pcbC,
    pcb_rho: pcbRho,
    pcb_thickness: pcbThickness,
    ambient_h_top: ambientHTop,
    ambient_h_bottom: ambientHBottom,
    margin: margin,
    components: [],
  };

  // Option A: compact encoded array of tuples
  // Tuple format (as provided): [x, y, l, w, h, powerObj, Rth_jc, Rth_ca, name]
  if (arrayParam) {
    const arr = decodeArrayParam(arrayParam);
    if (Array.isArray(arr)) {
      for (const t of arr) {
        if (!Array.isArray(t) || t.length < 9) continue;
        const [x, y, l, w, h, powerObj, Rth_jc, Rth_ca, name] = t;
        const mapped = mapPower(powerObj);
        payload.components.push({
          name: String(name),
          x: toFloat(x, 0),
          y: toFloat(y, 0),
          length: toFloat(l, 10),
          width: toFloat(w, 10),
          height: toFloat(h, 5),
          ...mapped,
          Rth_jc: toFloat(Rth_jc, 1),
          Rth_ca: toFloat(Rth_ca, 10),
        });
      }
    }
  }

  // Option B: expanded arrays id[], pl[], pw[], ph[], power[], Rth_jc[], Rth_ca[]
  if (payload.components.length === 0 && idList) {
    const pl = getAll(search, 'pl[]') || [];
    const pw = getAll(search, 'pw[]') || [];
    const ph = getAll(search, 'ph[]') || [];
    const power = getAll(search, 'power[]') || [];
    const rjc = getAll(search, 'Rth_jc[]') || [];
    const rca = getAll(search, 'Rth_ca[]') || [];
    // Optional positions can be in encoded array; if absent, default to (0,0)

    for (let i = 0; i < idList.length; i++) {
      const name = idList[i];
      const mapped = mapPower({ type: 'constant', value: toFloat(power[i], 1) });
      payload.components.push({
        name: String(name),
        x: 0,
        y: 0,
        length: toFloat(pl[i], 10),
        width: toFloat(pw[i], 10),
        height: toFloat(ph[i], 5),
        ...mapped,
        Rth_jc: toFloat(rjc[i], 1),
        Rth_ca: toFloat(rca[i], 10),
      });
    }
  }

  // If still no components parsed, return null to avoid breaking defaults
  if (!payload.components.length) return null;

  return payload;
}
