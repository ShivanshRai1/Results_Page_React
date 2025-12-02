import { useState } from 'react';

export const Sidebar = ({
  data,
  onToggleOutline,
  onToggleAutoScale,
  onToggleComponent,
}) => {
  const [showOutlines, setShowOutlines] = useState(true);
  const [autoScale, setAutoScale] = useState(true);

  const handleOutlineChange = (e) => {
    setShowOutlines(e.target.checked);
    onToggleOutline(e.target.checked);
  };

  const handleAutoScaleChange = (e) => {
    setAutoScale(e.target.checked);
    onToggleAutoScale(e.target.checked);
  };

  return (
    <aside>
      <h3>Run Summary</h3>
      <div className="side-section">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '6px', fontSize: '14px' }}>
          <div>Ambient</div>
          <div>
            <b>{data.meta.ambient}°C</b>
          </div>
          <div>Total Sim Time</div>
          <div>
            <b>{data.meta.simTime} s</b>
          </div>
          <div>Grid</div>
          <div>
            <b>{data.grid.dx}×{data.grid.dy} mm</b>
          </div>
          <div>Board k</div>
          <div>
            <b>0.9 W/mK</b>
          </div>
        </div>
      </div>

      <div className="side-section">
        <h3>Components</h3>
        <div className="checklist">
          {data.components.map((comp) => (
            <label key={comp.name}>
              <input
                type="checkbox"
                defaultChecked
                onChange={() => onToggleComponent(comp.name)}
              />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  className="swatch"
                  style={{
                    background: comp.color,
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                  }}
                ></span>
                {comp.name}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="side-section">
        <h3>View</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <input
            type="checkbox"
            checked={showOutlines}
            onChange={handleOutlineChange}
          />
          Show footprints on heatmaps
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            marginTop: '6px',
          }}
        >
          <input
            type="checkbox"
            checked={autoScale}
            onChange={handleAutoScaleChange}
          />
          Autoscale color range
        </label>
      </div>
    </aside>
  );
};
