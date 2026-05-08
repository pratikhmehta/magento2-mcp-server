/**
 * Utility functions for data transformation
 */

/**
 * Converts an array of objects to a CSV string
 * @param {Array} data
 * @returns {string}
 */
export function jsonToCsv(data) {
  if (!data || data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
  );

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const safeVal = val === null || val === undefined ? "" : String(val);
      const escaped = safeVal.replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}
