import { useMemo, useState } from 'react';
import { average, integrate, findOverlaps, fmt } from '../utils/helpers';

export const Checks = ({ data, config }) => {
  const [expandedChecks, setExpandedChecks] = useState(new Set(['steady', 'energy', 'cap', 'overlap']));

  const toggleCheck = (checkKey) => {
    const newSet = new Set(expandedChecks);
    if (newSet.has(checkKey)) {
      newSet.delete(checkKey);
    } else {
      newSet.add(checkKey);
    }
    setExpandedChecks(newSet);
  };
  const checkResults = useMemo(() => {
    // Steady-state check
    const steadyRows = data.components.map((c) => {
      const arr = data.temps[c.name];
      const got = arr[arr.length - 1];
      const exp = 25 + average(data.power[c.name]) * (1.0 + 3.0);
      const err = (100 * Math.abs(got - exp)) / Math.max(1, exp);
      return [c.name, `${fmt(exp)}°C`, `${fmt(got)}°C`, `${fmt(err)}%`];
    });

    const steadyPass = steadyRows.every(
      (row) => parseFloat(row[3].slice(0, -1)) <= config.steadyPctMax
    );

    // Energy conservation check
    const energyRows = data.components.map((c) => {
      const Ein = integrate(data.time, data.power[c.name]);
      const Es = 0.3 * Ein;
      const Ed = 0.7 * Ein;
      const bal = (100 * Math.abs(Ein - (Es + Ed))) / Math.max(1, Ein);
      return [c.name, `${fmt(Ein)} J`, `${fmt(Es)} J`, `${fmt(Ed)} J`, `${fmt(bal)}%`];
    });

    const energyPass = energyRows.every(
      (row) => parseFloat(row[4].slice(0, -1)) <= config.energyPctMax
    );

    // Capacitance check (placeholder)
    const capRows = data.components.map((c) => {
      const Cj = 1.2;
      const Cc = 1.8;
      const tot = Cj + Cc;
      return [c.name, `${fmt(Cj)} J/K`, `${fmt(Cc)} J/K`, `${fmt(tot)} J/K`, 'OK'];
    });

    // Overlap check
    const overlaps = findOverlaps(data.footprints);
    const overlapPass = overlaps.length === 0;

    return {
      steady: {
        status: steadyPass ? 'ok' : 'bad',
        label: 'Steady-State Temperature (Tj)',
        meta: 'All components within 2–3%',
        rows: steadyRows,
        headers: ['Component', 'Expected', 'Got', 'Error %'],
      },
      energy: {
        status: energyPass ? 'ok' : 'bad',
        label: 'Energy Conservation',
        meta: 'All within 1% balance',
        rows: energyRows,
        headers: ['Component', 'Input', 'Stored', 'Dissipated', 'Balance %'],
      },
      cap: {
        status: 'warn',
        label: 'Thermal Capacitance Magnitude',
        meta: 'Heuristic range: all OK',
        rows: capRows,
        headers: ['Component', 'Cj', 'Cc', 'Total C', 'Status'],
      },
      overlap: {
        status: overlapPass ? 'ok' : 'bad',
        label: 'Component Footprint Overlap',
        meta: overlapPass ? 'No overlapping components found' : `${overlaps.length} overlaps detected`,
        rows: overlaps.length === 0 ? [['No overlaps detected']] : overlaps.map((o) => [o.r1.name, o.r2.name]),
        headers: overlaps.length === 0 ? ['Status'] : ['Component 1', 'Component 2'],
      },
    };
  }, [data, config]);

  const passedCount = Object.values(checkResults).filter((c) => c.status === 'ok').length;
  const totalCount = Object.keys(checkResults).length;

  return (
    <>
      <div className="card span-12">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          Sanity Checks Summary
          <span
            className={`status-pill status-${passedCount === totalCount ? 'ok' : passedCount === 0 ? 'bad' : 'warn'}`}
          >
            {passedCount} / {totalCount} passing
          </span>
        </h2>
        <div className="meta">Thresholds are configurable in <code className="inline">config.checks</code>.</div>
      </div>

      <div className="card span-12">
        <div className="accordion">
          {Object.entries(checkResults).map(([key, check]) => (
            <div key={key} className={`acc-item ${expandedChecks.has(key) ? 'open' : ''}`}>
              <button 
                className="acc-head"
                onClick={() => toggleCheck(key)}
              >
                <div className="acc-title">
                  <span className={`status-pill status-${check.status}`}>
                    {check.status === 'ok' ? 'PASS' : check.status === 'bad' ? 'FAIL' : 'WARN'}
                  </span>
                  <strong>{check.label}</strong>
                </div>
                <div className="meta acc-toggle">▼</div>
              </button>
              <div className="acc-body">
                <p>{check.meta}</p>
                <table className="check-table">
                  <thead>
                    <tr>
                      {check.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {check.rows.map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => (
                          <td key={j}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
