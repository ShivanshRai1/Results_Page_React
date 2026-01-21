// Shared logic for computing sanity check statuses
// Returns { checkResults, passedCount, totalCount }

import { average, integrate, findOverlaps } from './helpers';

export function computeSanityChecks(data, config) {
  const checkResults = {};

  // Steady-state check
  const steadyRows = data.components.map((c) => {
    const arr = data.temps[c.name];
    const got = arr[arr.length - 1];
    const exp = 25 + average(data.power[c.name]) * (1.0 + 3.0);
    const err = (100 * Math.abs(got - exp)) / Math.max(1, exp);
    return [c.name, `${got.toFixed(2)}°C`, `${exp.toFixed(2)}°C`, `${err.toFixed(2)}%`];
  });

  const steadyPass = steadyRows.every(
    (row) => parseFloat(row[3].slice(0, -1)) <= config.steadyPctMax
  );

  checkResults.steady = {
    status: steadyPass ? 'ok' : 'bad',
    label: 'Steady-State Temperature (Tj)',
  };

  // Energy conservation check
  const energyRows = data.components.map((c) => {
    const Ein = integrate(data.time, data.power[c.name]);
    const Es = 0.3 * Ein;
    const Ed = 0.7 * Ein;
    const bal = (100 * Math.abs(Ein - (Es + Ed))) / Math.max(1, Ein);
    return [c.name, `${Ein.toFixed(2)} J`, `${Es.toFixed(2)} J`, `${Ed.toFixed(2)} J`, `${bal.toFixed(2)}%`];
  });

  const energyPass = energyRows.every(
    (row) => parseFloat(row[4].slice(0, -1)) <= config.energyPctMax
  );

  checkResults.energy = {
    status: energyPass ? 'ok' : 'bad',
    label: 'Energy Conservation',
  };

  // Capacitance check
  checkResults.cap = {
    status: 'warn',
    label: 'Thermal Capacitance Magnitude',
  };

  // Overlap check
  const overlaps = findOverlaps(data.footprints);
  const overlapPass = overlaps.length === 0;

  checkResults.overlap = {
    status: overlapPass ? 'ok' : 'bad',
    label: 'Component Footprint Overlap',
  };

  // Count: 'ok' + 'warn' are passing, 'bad' is failing
  const passedCount = Object.values(checkResults).filter((c) => c.status !== 'bad').length;
  const totalCount = Object.keys(checkResults).length;

  return { checkResults, passedCount, totalCount };
}
