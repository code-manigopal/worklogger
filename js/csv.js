// Thin wrapper around PapaParse so the rest of the app never
// touches raw CSV text directly.
const CSVUtil = {
  parse(text, header) {
    if (!text || !text.trim()) return [];
    const result = Papa.parse(text.trim(), { header: true, skipEmptyLines: true });
    return result.data;
  },

  stringify(rows, header) {
    return Papa.unparse({ fields: header, data: rows.map(r => header.map(h => r[h] ?? "")) });
  },

  emptyWithHeader(header) {
    return header.join(",") + "\n";
  }
};
