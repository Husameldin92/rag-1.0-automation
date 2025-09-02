const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Minimal CLI arg getter
function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

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

function getLatestJsonFiles(prefix, count) {
  if (!fs.existsSync(JSON_DIR)) throw new Error(`JSON dir not found: ${JSON_DIR}`);
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .map(f => ({
      name: f,
      full: path.join(JSON_DIR, f),
      mtime: fs.statSync(path.join(JSON_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length < count) throw new Error(`Need at least ${count} files for prefix: ${prefix}`);
  return files.slice(0, count).map(x => x.full);
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
        Question: item.question || '',
        Keywords: item.keywords || '',
        Rank: idx, // 0-based
        POC_Id: item._id || '',
        Title: item.title || '',
        ContentType: item.contentType || '',
        IndexBrandName: item.indexBrandName || '',
        IndexSeriesName: item.indexSeriesName || '',
        SortDate: item.sortDate || '',
        Experts: Array.isArray(item.experts) ? item.experts.join(', ') : '',
        Score: typeof item.score === 'number' ? item.score : ''
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
    const scoreDiscoverById = new Map();
    listDiscover.forEach((item, idx) => {
      rankDiscoverById.set(item._id, idx);
      metaById.set(item._id, item);
      scoreDiscoverById.set(item._id, typeof item.score === 'number' ? item.score : '');
    });

    const rankDiscoveryTestById = new Map();
    const scoreDiscoveryTestById = new Map();
    listDiscoveryTest.forEach((item, idx) => {
      rankDiscoveryTestById.set(item._id, idx);
      if (!metaById.has(item._id)) metaById.set(item._id, item);
      scoreDiscoveryTestById.set(item._id, typeof item.score === 'number' ? item.score : '');
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
      // In prod-vs-stage mode, we keep 'match' even if ranks differ

      compare.push({
        Series: series,
        Language: language,
        POC_Id: id,
        Title: m.title || '',
        Question: m.question || '',
        Keywords: m.keywords || '',
        ContentType: m.contentType || '',
        IndexBrandName: m.indexBrandName || '',
        IndexSeriesName: m.indexSeriesName || '',
        SortDate: m.sortDate || '',
        Experts: Array.isArray(m.experts) ? m.experts.join(', ') : '',
        Rank_discover: rankDiscover,
        Score_discover: scoreDiscoverById.has(id) ? scoreDiscoverById.get(id) : '',
        Rank_discoveryTest: rankDiscoveryTest,
        Score_discoveryTest: scoreDiscoveryTestById.has(id) ? scoreDiscoveryTestById.get(id) : '',
        Status: status
      });
    }
  }

  return compare;
}

function writeWorkbook({ rowsDiscover, rowsDiscoveryTest, rowsCompare, sheetNameDiscover = 'PROD', sheetNameDiscoveryTest = 'STAGE', sheetNameCompare = 'compare' }) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const wb = XLSX.utils.book_new();

  const wsDiscover = XLSX.utils.json_to_sheet(rowsDiscover);
  XLSX.utils.book_append_sheet(wb, wsDiscover, sheetNameDiscover);

  const wsDiscoveryTest = XLSX.utils.json_to_sheet(rowsDiscoveryTest);
  XLSX.utils.book_append_sheet(wb, wsDiscoveryTest, sheetNameDiscoveryTest);

  const wsCompare = XLSX.utils.json_to_sheet(rowsCompare);
  XLSX.utils.book_append_sheet(wb, wsCompare, sheetNameCompare);

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(OUT_DIR, `compare_${ts}.xlsx`);
  XLSX.writeFile(wb, outFile);
  console.log(`✅ Compare workbook saved: ${outFile}`);
}

function main() {
  const mode = getArg('--mode', 'prodStage'); // 'prodStage' | 'stage'
  if (mode === 'stage') {
    // Stage vs Stage: newest as NEW, previous as OLD
    const [fileNew, fileOld] = getLatestJsonFiles('discoveryTest_', 2); // sorted desc; index 0 newest
    const labelOld = getArg('--oldLabel', 'STAGE_OLD');
    const labelNew = getArg('--newLabel', 'STAGE_NEW');
    const compareLabel = `${labelOld} VS ${labelNew}`;

    const rowsNewRaw = loadRowsFromJson(fileNew);
    const rowsOldRaw = loadRowsFromJson(fileOld);

    const groupedNew = groupBySeriesLanguage(rowsNewRaw);
    const groupedOld = groupBySeriesLanguage(rowsOldRaw);

    const rowsOld = buildEndpointSheetRows(groupedOld);
    const rowsNew = buildEndpointSheetRows(groupedNew);

    // Build compare with stage-specific status logic
    const compare = [];
    const allKeys = new Set([...groupedOld.keys(), ...groupedNew.keys()]);
    for (const key of allKeys) {
      const [series, language] = key.split('|||');
      const listOld = groupedOld.get(key) || [];
      const listNew = groupedNew.get(key) || [];

      const rankOldById = new Map();
      const scoreOldById = new Map();
      const metaById = new Map();
      listOld.forEach((item, idx) => {
        rankOldById.set(item._id, idx);
        scoreOldById.set(item._id, typeof item.score === 'number' ? item.score : '');
        metaById.set(item._id, item);
      });
      const rankNewById = new Map();
      const scoreNewById = new Map();
      listNew.forEach((item, idx) => {
        rankNewById.set(item._id, idx);
        scoreNewById.set(item._id, typeof item.score === 'number' ? item.score : '');
        if (!metaById.has(item._id)) metaById.set(item._id, item);
      });

      const allIds = new Set([...rankOldById.keys(), ...rankNewById.keys()]);
      for (const id of allIds) {
        const m = metaById.get(id) || {};
        const rOld = rankOldById.has(id) ? rankOldById.get(id) : '';
        const rNew = rankNewById.has(id) ? rankNewById.get(id) : '';
        let status = 'match';
        if (rOld === '' && rNew !== '') status = 'only_in_new';
        else if (rNew === '' && rOld !== '') status = 'only_in_old';
        else if (rOld !== '' && rNew !== '' && rOld !== rNew) status = 'rank_changed';

        compare.push({
          Series: series,
          Language: language,
          Question: m.question || '',
          Keywords: m.keywords || '',
          POC_Id: id,
          Title: m.title || '',
          ContentType: m.contentType || '',
          IndexBrandName: m.indexBrandName || '',
          IndexSeriesName: m.indexSeriesName || '',
          SortDate: m.sortDate || '',
          Rank_old: rOld,
          Score_old: scoreOldById.has(id) ? scoreOldById.get(id) : '',
          Rank_new: rNew,
          Score_new: scoreNewById.has(id) ? scoreNewById.get(id) : '',
          Status: status
        });
      }
    }

    writeWorkbook({
      rowsDiscover: rowsOld,
      rowsDiscoveryTest: rowsNew,
      rowsCompare: compare,
      sheetNameDiscover: labelOld,
      sheetNameDiscoveryTest: labelNew,
      sheetNameCompare: compareLabel
    });
    return;
  }

  // Default: prod vs stage
  const fileDiscover = getLatestJsonFile('discover_');
  const fileDiscoveryTest = getLatestJsonFile('discoveryTest_');

  const rowsDiscoverRaw = loadRowsFromJson(fileDiscover);
  const rowsDiscoveryTestRaw = loadRowsFromJson(fileDiscoveryTest);

  // Group and build endpoint sheets with rank
  const groupedDiscover = groupBySeriesLanguage(rowsDiscoverRaw);
  const groupedDiscoveryTest = groupBySeriesLanguage(rowsDiscoveryTestRaw);

  const rowsDiscover = buildEndpointSheetRows(groupedDiscover);
  const rowsDiscoveryTest = buildEndpointSheetRows(groupedDiscoveryTest);

  // Build compare sheet (prod-vs-stage rules)
  const rowsCompare = buildCompareRows(groupedDiscover, groupedDiscoveryTest);

  writeWorkbook({ rowsDiscover, rowsDiscoveryTest, rowsCompare });
}

main();


