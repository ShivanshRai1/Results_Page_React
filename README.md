# PCB Thermal Analysis Dashboard — React Version

A React + Vite port of the vanilla HTML/CSS/JS thermal analysis dashboard. Interactive visualization of PCB heatmaps, temperature plots, power profiles, and sanity checks.

## Features

✨ **Interactive Heatmaps** — View top surface, bottom surface, and weighted average temperature distributions  
📊 **Temperature & Power Plots** — Per-component junction and case temperature curves  
🔍 **Sanity Checks** — Automated validation of steady-state, energy balance, capacitance, and footprint overlaps  
🌙 **Dark/Light Theme Toggle** — Seamless theme switching with CSS variables  
📱 **Responsive Design** — Works on desktop and tablet viewports  
⚡ **Real-time Interactivity** — Click tabs, toggle components, adjust view options  

## Setup & Installation

### Prerequisites
- Node.js 16+ with npm

### Quick Start

```bash
# Install dependencies
npm install

# Start dev server (opens automatically on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── App.jsx                 # Main app container, state management
├── main.jsx               # React entry point
├── components/
│   ├── Header.jsx         # Top bar with branding and controls
│   ├── Sidebar.jsx        # Run summary, component list, toggles
│   ├── Heatmap.jsx        # 2D heatmap visualization (uses Plotly)
│   ├── TemperaturePlots.jsx  # Time-series temp curves
│   ├── PowerPlots.jsx     # Power consumption over time
│   ├── Checks.jsx         # Sanity check results table/accordion
│   └── ThemeContext.jsx   # Dark/light theme provider
├── utils/
│   ├── demoData.js        # Synthetic thermal simulation data
│   └── helpers.js         # Formatting, math utilities
└── styles/
    └── index.css          # Global styles with CSS variables

public/
├── index.html             # HTML entry point
```

## Architecture

**State Management:** React `useState` and `useContext` for theme toggling  
**Plotting:** Plotly.js (dist-min) via useRef + useEffect for chart rendering  
**Styling:** CSS variables supporting dark/light themes, responsive grid layout  
**Data:** Synthetic demo data generator (matches original vanilla JS logic)  

## Key Components

### Heatmap
- Displays 2D temperature field with optional component footprint outlines
- Uses Plotly heatmap trace with Inferno colorscale
- Shows min/max temperature in metadata

### TemperaturePlots & PowerPlots
- Multi-series line plots with per-component legends
- Synchronized hover/click interactions via Plotly
- Component visibility controlled by sidebar checkboxes

### Checks
- Accordion-style results card with expandable check details
- Computes steady-state error, energy balance, capacitance warnings, footprint overlaps
- Dynamic pass/warn/fail status badges

### Theme
- Context provider enables dark/light mode toggle
- CSS variables control all colors, shadows, borders
- Theme state persists across remounts via class on `<body>`

## Demo Data

The app ships with synthetic thermal data:
- **4 components** with different power profiles (square pulse, constant, sinusoidal, parabolic)
- **2D fields** (top/bottom surfaces, 55×42 grid) with realistic temperature gaussians
- **Transient curves** simulated using first-order thermal RC model
- **50 seconds** of simulation time sampled at 0.05 s intervals

To replace with your own data:
1. Call `window.loadThermalResults(customData)` (or modify `generateDemoData()`)
2. Match the data shape from `src/utils/demoData.js`

## Customization

### Adjust Check Thresholds
Edit `config.checks` in `src/App.jsx`:
```jsx
const config = {
  checks: {
    steadyPctMax: 5,      // % max error allowed
    energyPctMax: 2,      // % energy imbalance allowed
    capWarnPct: 25        // % outside heuristic range
  },
};
```

### Change Colors & Styling
Update `src/styles/index.css` CSS variables:
```css
:root {
  --accent: #6ea8fe;    /* Primary color */
  --ok: #2ecc71;        /* Pass status */
  --warn: #f1c40f;      /* Warning status */
  --bad: #e74c3c;       /* Fail status */
  /* ... more variables ... */
}
```

### Component Colors
Edit `generateDemoData()` in `src/utils/demoData.js`:
```jsx
const comps = [
  { name: 'Q1_SquarePulse', color: '#4f46e5' },  // Change hex code
  // ...
];
```

## Differences from Vanilla Version

✅ **Converted to React components** with hooks (useState, useContext, useEffect, useMemo)  
✅ **Plotly.js** used directly (instead of react-plotly.js wrapper)  
✅ **JavaScript only** (no TypeScript) for simplicity  
✅ **Vite** for fast HMR and optimized builds  
✅ **Same styling, layouts, and feature parity** with original  
⚠️ **Export feature** is simplified (console.log placeholder)  
⚠️ **Tests** (built-in UI tests from original) not yet ported  

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Tips

- **HMR** (hot module replacement) enabled; edit components and see changes instantly
- **Lazy plot updates:** Only re-render heatmap/plots when data or visibility changes
- **CSS transitions:** Smooth theme switches with 0.2s transitions

## Future Enhancements

- [ ] Export to PNG/PDF with proper image resolution
- [ ] Undo/redo for parameter changes
- [ ] CSV export of check results
- [ ] Custom colorscale picker
- [ ] Keyboard navigation for accordion and tabs
- [ ] Unit tests with Vitest/React Testing Library

## License

MIT — Feel free to use and modify.

---

**Built with React, Vite, and Plotly.js**  
Original vanilla HTML/JS version converted to React with feature parity.
