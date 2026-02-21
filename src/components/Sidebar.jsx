export const Sidebar = ({
  data,
  onToggleComponent,
  variant = 'grid',
}) => {
  const runSummaryCard = (
    <div className="card span-6 grid-card">
      <div className="card-header">
        <div>
          <h2>Run Summary</h2>
          <div className="meta">Ambient, sim time, grid size, board k</div>
        </div>
      </div>
      <div className="grid-details">
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
  );

  const componentsCard = (
    <div className="card span-6 grid-card">
      <div className="card-header">
        <div>
          <h2>Components</h2>
          <div className="meta">Toggle visibility across all plots</div>
        </div>
      </div>
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
  );

  if (variant === 'grid') {
    return (
      <>
        {runSummaryCard}
        {componentsCard}
      </>
    );
  }

  return (
    <aside>
      <h3>Run Summary</h3>
      <div className="side-section">
        <div className="grid-details">
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

    </aside>
  );
};
