const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Config: where to read JSONs and where to write the workbook
const JSON_DIR = path.join(__dirname, '..', 'retrieval-automation', 'results', 'json');
const OUT_DIR = path.join(__dirname, 'results');

// Utility: get newest file matching a prefix
function getLatestJsonFile(prefix) {
  if (!fs.existsSync(JSON_DIR)) throw new Error(`JSON dir not found: ${JSON_DIR}`);
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => ({
      name: f,
      full: path.join(JSON_DIR, f),
      mtime: fs.statSync(path.join(JSON_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) throw new Error(`No files found for prefix: ${prefix}`);
  return files[0].full;
}

function loadRowsFromJson(file) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw || !Array.isArray(raw.rows)) return [];
  return raw.rows;
}

// Group rows by (series, language) preserving order to compute rank (0-based)
function groupBySeriesLanguage(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.questionId}|||${r.language}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return map;
}

// Build sheet rows with Rank for an endpoint
function buildEndpointSheetRows(grouped) {
  const sheetRows = [];
  for (const [key, arr] of grouped.entries()) {
    const [series, language] = key.split('|||');
    arr.forEach((item, idx) => {
      sheetRows.push({
        Series: series,
        Language: language,
        Rank: idx, // 0-based
        _id: item._id || '',
        Title: item.title || '',
        SchemaType: item.schemaType || '',
        ParentName: item.parentName || '',
        ParentGenre: item.parentGenre || ''
      });
    });
  }
  return sheetRows;
}

// Build compare rows across endpoints
function buildCompareRows(groupedDiscover, groupedDiscoveryTest) {
  const compare = [];
  const allKeys = new Set([...groupedDiscover.keys(), ...groupedDiscoveryTest.keys()]);

  for (const key of allKeys) {
    const [series, language] = key.split('|||');
    const listDiscover = groupedDiscover.get(key) || [];
    const listDiscoveryTest = groupedDiscoveryTest.get(key) || [];

    // Index by _id for rank lookup
    const rankDiscoverById = new Map();
    const metaById = new Map();
    listDiscover.forEach((item, idx) => {
      rankDiscoverById.set(item._id, idx);
      metaById.set(item._id, item);
    });

    const rankDiscoveryTestById = new Map();
    listDiscoveryTest.forEach((item, idx) => {
      rankDiscoveryTestById.set(item._id, idx);
      if (!metaById.has(item._id)) metaById.set(item._id, item);
    });

    // Union of IDs
    const allIds = new Set([...rankDiscoverById.keys(), ...rankDiscoveryTestById.keys()]);

    for (const id of allIds) {
      const m = metaById.get(id) || {};
      const rankDiscover = rankDiscoverById.has(id) ? rankDiscoverById.get(id) : '';
      const rankDiscoveryTest = rankDiscoveryTestById.has(id) ? rankDiscoveryTestById.get(id) : '';
      let status = 'match';
      if (rankDiscover === '' && rankDiscoveryTest !== '') status = 'only_in_discoveryTest';
      if (rankDiscoveryTest === '' && rankDiscover !== '') status = 'only_in_discover';

      compare.push({
        Series: series,
        Language: language,
        _id: id,
        Title: m.title || '',
        SchemaType: m.schemaType || '',
        ParentName: m.parentName || '',
        ParentGenre: m.parentGenre || '',
        Rank_discover: rankDiscover,
        Rank_discoveryTest: rankDiscoveryTest,
        Status: status
      });
    }
  }

  return compare;
}

function writeWorkbook({ rowsDiscover, rowsDiscoveryTest, rowsCompare }) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const wb = XLSX.utils.book_new();

  const wsDiscover = XLSX.utils.json_to_sheet(rowsDiscover);
  XLSX.utils.book_append_sheet(wb, wsDiscover, 'discover');

  const wsDiscoveryTest = XLSX.utils.json_to_sheet(rowsDiscoveryTest);
  XLSX.utils.book_append_sheet(wb, wsDiscoveryTest, 'discoveryTest');

  const wsCompare = XLSX.utils.json_to_sheet(rowsCompare);
  XLSX.utils.book_append_sheet(wb, wsCompare, 'compare');

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(OUT_DIR, `compare_${ts}.xlsx`);
  XLSX.writeFile(wb, outFile);
  console.log(`✅ Compare workbook saved: ${outFile}`);
}

function main() {
  // Load latest endpoint JSONs
  const fileDiscover = getLatestJsonFile('discover_');
  const fileDiscoveryTest = getLatestJsonFile('discoveryTest_');

  const rowsDiscoverRaw = loadRowsFromJson(fileDiscover);
  const rowsDiscoveryTestRaw = loadRowsFromJson(fileDiscoveryTest);

  // Group and build endpoint sheets with rank
  const groupedDiscover = groupBySeriesLanguage(rowsDiscoverRaw);
  const groupedDiscoveryTest = groupBySeriesLanguage(rowsDiscoveryTestRaw);

  const rowsDiscover = buildEndpointSheetRows(groupedDiscover);
  const rowsDiscoveryTest = buildEndpointSheetRows(groupedDiscoveryTest);

  // Build compare sheet
  const rowsCompare = buildCompareRows(groupedDiscover, groupedDiscoveryTest);

  writeWorkbook({ rowsDiscover, rowsDiscoveryTest, rowsCompare });
}

main();


