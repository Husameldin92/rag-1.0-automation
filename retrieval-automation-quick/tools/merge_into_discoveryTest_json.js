const fs = require('fs');
const path = require('path');

function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const QUESTION_ID = getArg('--questionId', '').trim(); // required
const LANGUAGE = getArg('--language', '').trim(); // required: en|de|nl
const MODE = getArg('--mode', 'append'); // append | replace
const SOURCE = getArg('--source', ''); // optional path to quick JSON
const TARGET = getArg('--target', ''); // optional path to retrieval discoveryTest JSON
const QUESTION_FILTER = getArg('--questionFilter', ''); // optional: exact match on quick Question

if (!QUESTION_ID || !LANGUAGE) {
  console.error('❌ Required flags: --questionId "<Series>" --language <en|de|nl>');
  process.exit(1);
}
if (!['append', 'replace'].includes(MODE)) {
  console.error('❌ --mode must be append or replace');
  process.exit(1);
}

const QUICK_JSON_DIR = path.join(__dirname, '..', 'results', 'json');
const RETRIEVAL_JSON_DIR = path.join(__dirname, '..', '..', 'retrieval-automation', 'results', 'json');

function latestFileMatching(dir, pattern) {
  const files = fs.readdirSync(dir)
    .filter(f => pattern.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) return null;
  return path.join(dir, files[0].f);
}

function loadJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function toRetrievalRowFromQuick(quickRow) {
  return {
    questionId: QUESTION_ID,
    endpoint: 'discoveryTest',
    language: LANGUAGE,
    question: quickRow.Question || '',
    keywords: quickRow.Keywords || '',
    _id: quickRow._id || '',
    title: quickRow.Title || '',
    parentGenre: '',
    contentType: quickRow.ContentType || '',
    indexBrandName: quickRow.IndexBrandName || '',
    indexSeriesName: quickRow.IndexSeriesName || '',
    score: typeof quickRow.Score === 'number' ? quickRow.Score : '',
    sortDate: quickRow.SortDate || ''
  };
}

function main() {
  const quickFile = SOURCE
    ? path.resolve(SOURCE)
    : latestFileMatching(QUICK_JSON_DIR, /^two_questions_discoveryTest_.*\.json$/);
  if (!quickFile || !fs.existsSync(quickFile)) {
    console.error('❌ Quick JSON not found. Provide --source or run quick first.');
    process.exit(1);
  }

  const targetFile = TARGET
    ? path.resolve(TARGET)
    : latestFileMatching(RETRIEVAL_JSON_DIR, /^discoveryTest_.*\.json$/);
  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error('❌ Target discoveryTest JSON not found. Provide --target or run retrieval first.');
    process.exit(1);
  }

  const quick = loadJson(quickFile);
  const quickRows = Array.isArray(quick.rows) ? quick.rows : [];
  const filteredQuickRows = QUESTION_FILTER
    ? quickRows.filter(r => (r.Question || '') === QUESTION_FILTER)
    : quickRows;

  if (!filteredQuickRows.length) {
    console.error('❌ No rows found in quick JSON after filtering.');
    process.exit(1);
  }

  const mapped = filteredQuickRows.map(toRetrievalRowFromQuick);

  const target = loadJson(targetFile);
  const existingRows = Array.isArray(target.rows) ? target.rows : [];

  let nextRows;
  if (MODE === 'replace') {
    nextRows = existingRows.filter(r => !(r.questionId === QUESTION_ID && r.language === LANGUAGE));
    nextRows.push(...mapped);
  } else {
    nextRows = existingRows.concat(mapped);
  }

  const outNameTs = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(RETRIEVAL_JSON_DIR, `discoveryTest_${outNameTs}_merged.json`);
  const out = { ...target, rows: nextRows };
  saveJson(outFile, out);

  console.log('✅ Merged quick → discoveryTest JSON');
  console.log('Quick:', quickFile);
  console.log('Base:', targetFile);
  console.log('Out :', outFile);
  console.log('Mode:', MODE);
  console.log('Added rows:', mapped.length);
}

main();


