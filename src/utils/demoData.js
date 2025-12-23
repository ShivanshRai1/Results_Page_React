// Demo data generation

export const generateDemoData = () => {
  const nx = 55;
  const ny = 42;

  // Generate 2D temperature fields with synthetic gaussians
  const makeField = (bias = 0) => {
    const z = [];
    for (let j = 0; j < ny; j++) {
      const row = [];
      for (let i = 0; i < nx; i++) {
        const r = Math.hypot(i - nx * 0.35, j - ny * 0.6);
        const r2 = Math.hypot(i - nx * 0.7, j - ny * 0.3);
        const val =
          25 +
          bias +
          40 * Math.exp(-r / 12) +
          22 * Math.exp(-r2 / 10) +
          3 * Math.random();
        row.push(val);
      }
      z.push(row);
    }
    return z;
  };

  const top = makeField(0.5);
  const bottom = makeField(-0.5);
  const avg = top.map((row, j) =>
    row.map((v, i) => 0.6 * top[j][i] + 0.4 * bottom[j][i])
  );

  const comps = [
    { name: 'Q1_SquarePulse', color: '#4f46e5' },
    { name: 'D1_Constant', color: '#16a34a' },
    { name: 'U1_Sinusoidal', color: '#f59e0b' },
    { name: 'T1_Parabolic', color: '#ef4444' },
  ];

  // Simulate for full 600 seconds; dt tuned to keep curve smooth without overloading Plotly
  const T_MAX = 600;
  const dt = 0.25;
  const t = [...Array(Math.floor(T_MAX / dt)).keys()].map((i) => +(i * dt).toFixed(2));

  // Power waveform generators
  const sqPower = (t, period = 2, duty = 0.5, peak = 3) =>
    (t % period) < duty * period ? peak : 0;

  const power = {
    Q1_SquarePulse: t.map((x) => sqPower(x, 2, 0.5, 3)),
    D1_Constant: t.map((_) => 1.5),
    U1_Sinusoidal: t.map((x) => 1.5 + 1.5 * Math.sin(2 * Math.PI * 0.2 * x)),
    T1_Parabolic: t.map((x) => {
      const p = 6;
      const m = 2.0;
      const m1 = x % p;
      return m1 > p / 2 ? m * ((m1 / (p / 2)) - 1) ** 2 : m * (1 - m1 / (p / 2)) ** 2;
    }),
  };

  // Compute temperature curves using first-order thermal model
  const temps = {};
  const cases = {};

  for (const c of comps) {
    let tj = 25;
    let tc = 25;
    const tauJ = 3 + Math.random() * 3;
    const tauC = 7 + Math.random() * 6;
    temps[c.name] = [];
    cases[c.name] = [];

    for (let idx = 0; idx < t.length; idx++) {
      const P = power[c.name][idx];
      tj += ((P * 0.8 - (tj - tc) / 1.3) / tauJ) * dt;
      tc += (((tj - tc) / 1.3 - (tc - 25) / 3.4) / tauC) * dt;
      temps[c.name].push(tj);
      cases[c.name].push(tc);
    }
  }

  const footprints = [
    { name: 'Q1_SquarePulse', x: 7, y: 40, l: 10, w: 10 },
    { name: 'D1_Constant', x: 30, y: 40, l: 5, w: 5 },
    { name: 'U1_Sinusoidal', x: 35, y: 10, l: 8, w: 8 },
    { name: 'T1_Parabolic', x: 5, y: 10, l: 6, w: 6 },
  ];

  return {
    grid: { nx, ny, dx: 1, dy: 1 },
    fields: { top, bottom, avg },
    time: t,
    power,
    temps,
    cases,
    components: comps,
    footprints,
    meta: { ambient: 25, simTime: 600 },
  };
};
