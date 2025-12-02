import { useTheme } from './ThemeContext';

export const Header = ({ passedChecks, totalChecks, onExport }) => {
  const { toggleTheme } = useTheme();

  const chipClass = passedChecks === totalChecks ? 'ok' : passedChecks === 0 ? 'bad' : 'warn';
  const dotColor =
    passedChecks === totalChecks
      ? 'var(--ok)'
      : passedChecks === 0
      ? 'var(--bad)'
      : 'var(--warn)';

  return (
    <header>
      <div className="brand">
        <div className="logo" aria-hidden="true"></div>
        <div>
          <h1>PCB Thermal Analysis — Results</h1>
          <div className="sub">Dual-surface model • Heatmaps • Plots • Sanity Checks</div>
        </div>
      </div>
      <div className="actions">
        <div className={`chip ${chipClass}`} title="Overall sanity status" role="button">
          <span className="dot" style={{ background: dotColor }}></span>
          <span>Checks: {passedChecks}/{totalChecks} passing</span>
        </div>
        <button className="btn" onClick={toggleTheme} title="Toggle theme">
          Toggle Theme
        </button>
        <button className="btn" onClick={onExport}>
          Export View
        </button>
      </div>
    </header>
  );
};
