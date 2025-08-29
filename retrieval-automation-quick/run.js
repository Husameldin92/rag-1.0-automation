const https = require('https');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const endpoint = getArg('--endpoint', 'discoveryTest'); // 'discover' | 'discoveryTest'
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2N2E5YjNiYTJlZDBmZTA3Mjk3NDg5NjQiLCJpYXQiOjE3NTYxMTkyNzQsImV4cCI6MTc1OTU3NTI3NH0.zk0FU1APcn3n-9pVcsq6p57aJgJm108V04aCDDZzgWg';
const token = getArg('--token', process.env.ACCESS_TOKEN || DEFAULT_TOKEN);
const outDir = path.join(__dirname, 'results');

if (!token) {
  console.error('❌ Missing token. Pass --token or set ACCESS_TOKEN.');
  process.exit(1);
}

if (!['discover', 'discoveryTest'].includes(endpoint)) {
  console.error('❌ --endpoint must be "discover" or "discoveryTest"');
  process.exit(1);
}

// Collect questions: either multiple --questions "q1" "q2" ... or a comma separated string
let questions = [];
const qIdx = process.argv.indexOf('--questions');
if (qIdx !== -1) {
  // Gather all subsequent args until next flag or end
  for (let i = qIdx + 1; i < process.argv.length; i++) {
    const val = process.argv[i];
    if (val.startsWith('--')) break;
    questions.push(val);
  }
}
if (questions.length === 1 && questions[0].includes(',')) {
  questions = questions[0].split(',').map(s => s.trim()).filter(Boolean);
}

if (questions.length === 0) {
  console.error('❌ Provide questions via --questions "q1" "q2"');
  process.exit(1);
}

function postGraphQL({ question }) {
  return new Promise((resolve) => {
    const query = endpoint === 'discoveryTest'
      ? `query DiscoveryTest($question: String) {\n  discoveryTest(question: $question) {\n    keywords\n    results {\n      _id\n      title\n      contentType\n      indexBrandName\n      indexSeriesName\n      score\n      sortDate\n    }\n  }\n}`
      : `query ($question: String!) { ${endpoint}(question: $question) { results { _id title contentType indexBrandName indexSeriesName score sortDate __typename } __typename } }`;
    const payload = JSON.stringify({ query, variables: { question } });
    const options = {
      hostname: 'concord.sandsmedia.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'retrieval-automation-quick/1.0',
        'access-token': token,
      }
    };
    const start = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = {};
        try { json = JSON.parse(data); } catch (_) {}
        const container = json?.data?.[endpoint] || {};
        const arr = container?.results || [];
        const keywords = container?.keywords || '';
        resolve({ question, ms: Date.now() - start, status: res.statusCode, items: arr, keywords });
      });
    });
    req.on('error', (err) => resolve({ question, ms: Date.now() - start, status: 0, error: err.message, items: [] }));
    req.write(payload);
    req.end();
  });
}

async function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const allRows = [];
  let idx = 0;
  for (const q of questions) {
    idx += 1;
    const r = await postGraphQL({ question: q });
    console.log(`${r.status === 200 ? '✅' : '❌'} ${endpoint} ${idx}/${questions.length} (${r.ms}ms) - count: ${r.items.length}`);
    r.items.forEach((it, idx) => {
      // Unified output columns for both endpoints with 0-based Rank
      allRows.push({
        Question: q,
        Keywords: r.keywords || '',
        Rank: idx,
        _id: it._id || '',
        Title: it.title || '',
        ContentType: it.contentType || '',
        IndexBrandName: it.indexBrandName || '',
        IndexSeriesName: it.indexSeriesName || '',
        Score: typeof it.score === 'number' ? it.score : '',
        SortDate: it.sortDate || ''
      });
    });
  }

  // Rename _id -> POC_Id for Excel output
  const excelRows = allRows.map(r => { const {_id, ...rest} = r; return { POC_Id: _id || '', ...rest }; });
  const ws = XLSX.utils.json_to_sheet(excelRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, endpoint.toUpperCase());
  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(outDir, `two_questions_${endpoint}_${ts}.xlsx`);
  XLSX.writeFile(wb, outFile);
  console.log('💾 Saved:', outFile);

  // JSON output (same rows)
  const jsonDir = path.join(outDir, 'json');
  if (!fs.existsSync(jsonDir)) fs.mkdirSync(jsonDir, { recursive: true });
  const jsonPath = path.join(jsonDir, `two_questions_${endpoint}_${ts}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({
    endpoint,
    questions,
    rows: allRows
  }, null, 2));
  console.log('💾 Saved JSON:', jsonPath);
}

main().catch((e) => { console.error('❌ Failed:', e); process.exit(1); });


