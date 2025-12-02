/**
 * Client-side CSV export utilities for thermal analysis data.
 */

/**
 * Converts a 2D heatmap grid to CSV format: x(mm), y(mm), temperature(°C)
 * @param {number[][]} field - 2D array of temperature values (ny rows × nx cols)
 * @param {number} dx - grid spacing x (mm)
 * @param {number} dy - grid spacing y (mm)
 * @param {number} x_min - minimum x coordinate (mm)
 * @param {number} y_min - minimum y coordinate (mm)
 * @returns {string} CSV string with header row
 */
export const gridToCsv = (field, dx = 1, dy = 1, x_min = 0, y_min = 0) => {
  const rows = ['x(mm),y(mm),temperature(C)'];
  
  for (let j = 0; j < field.length; j++) {
    const y = y_min + j * dy;
    const row = field[j];
    for (let i = 0; i < row.length; i++) {
      const x = x_min + i * dx;
      const temp = row[i].toFixed(3);
      rows.push(`${x.toFixed(3)},${y.toFixed(3)},${temp}`);
    }
  }
  
  return rows.join('\n');
};

/**
 * Converts time-series data (e.g., case & junction temperature) to CSV format.
 * @param {number[]} time - array of time values (seconds)
 * @param {Object.<string, number[]>} dataByComponent - object with component names as keys, arrays of values as values
 * @returns {string} CSV string with header row
 */
export const timeSeriesCsv = (time, dataByComponent) => {
  const componentNames = Object.keys(dataByComponent);
  
  // Build header
  const header = ['time(s)', ...componentNames];
  const rows = [header.join(',')];
  
  // Build data rows
  for (let i = 0; i < time.length; i++) {
    const rowData = [time[i].toFixed(3)];
    for (const name of componentNames) {
      rowData.push(dataByComponent[name][i].toFixed(3));
    }
    rows.push(rowData.join(','));
  }
  
  return rows.join('\n');
};

/**
 * Triggers a browser download of a CSV file.
 * @param {string} filename - name of the file (e.g., 'data.csv')
 * @param {string} csvContent - CSV content as a string
 */
export const downloadCsv = (filename, csvContent) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export all thermal analysis data as separate CSV files.
 * @param {Object} data - thermal data object from generateDemoData()
 */
export const exportAllCsvs = (data) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  
  // Heatmap CSVs
  const topCsv = gridToCsv(data.fields.top, data.grid.dx, data.grid.dy, 0, 0);
  const bottomCsv = gridToCsv(data.fields.bottom, data.grid.dx, data.grid.dy, 0, 0);
  const avgCsv = gridToCsv(data.fields.avg, data.grid.dx, data.grid.dy, 0, 0);
  
  // Time-series CSVs
  const caseJunctionCsv = timeSeriesCsv(data.time, data.cases);
  const tempCsv = timeSeriesCsv(data.time, data.temps);
  const powerCsv = timeSeriesCsv(data.time, data.power);
  
  // Trigger downloads with a small delay to avoid browser blocking
  const files = [
    { name: `top_surface-${timestamp}.csv`, content: topCsv },
    { name: `bottom_surface-${timestamp}.csv`, content: bottomCsv },
    { name: `average_surface-${timestamp}.csv`, content: avgCsv },
    { name: `case_temperature-${timestamp}.csv`, content: caseJunctionCsv },
    { name: `junction_temperature-${timestamp}.csv`, content: tempCsv },
    { name: `power_vs_time-${timestamp}.csv`, content: powerCsv },
  ];
  
  files.forEach((file, index) => {
    setTimeout(() => {
      downloadCsv(file.name, file.content);
    }, index * 200); // 200ms delay between downloads
  });
};
