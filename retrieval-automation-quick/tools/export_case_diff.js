const fs = require('fs');
const path = require('path');

const JSON_DIR = path.join(__dirname, '..', 'results', 'json');
const OUT_CSV = path.join(__dirname, '..', 'results', 'case_diff_report.csv');

function latestQuickJson() {
  const files = fs.readdirSync(JSON_DIR)
    .filter(f => /^two_questions_discoveryTest_.*\.json$/.test(f))
    .map(f => ({ f, t: fs.statSync(path.join(JSON_DIR, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  if (!files.length) throw new Error('No quick JSON found');
  return path.join(JSON_DIR, files[0].f);
}

function toMapById(list) {
  const m = new Map();
  for (const r of list) {
    const id = r.POC_Id || r._id;
    if (!id) continue;
    m.set(id, r);
  }
  return m;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

(function main() {
  const file = latestQuickJson();
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const rows = data.rows || [];

  // Group by Question
  const byQ = {};
  for (const r of rows) {
    const q = r.Question || '';
    if (!q) continue;
    (byQ[q] = byQ[q] || []).push(r);
  }

  const qs = Object.keys(byQ);
  if (qs.length < 2) throw new Error('Need two questions in the latest quick JSON');
  const [q1, q2] = qs;

  const m1 = toMapById(byQ[q1]);
  const m2 = toMapById(byQ[q2]);

  const ids1 = [...m1.keys()];
  const ids2 = [...m2.keys()];
  const s1 = new Set(ids1);
  const s2 = new Set(ids2);

  const only1 = ids1.filter(id => !s2.has(id));
  const only2 = ids2.filter(id => !s1.has(id));
  const both = ids1.filter(id => s2.has(id));

  const out = [[
    'Set', 'POC_Id', 'Title', 'Rank_in_q1', 'Rank_in_q2'
  ]];

  for (const id of only1) {
    const r = m1.get(id);
    out.push(['only_q1', id, r.Title || '', r.Rank ?? '', '']);
  }
  for (const id of only2) {
    const r = m2.get(id);
    out.push(['only_q2', id, r.Title || '', '', r.Rank ?? '']);
  }
  for (const id of both) {
    const r1 = m1.get(id);
    const r2 = m2.get(id);
    out.push(['both', id, (r1.Title || r2.Title || ''), r1.Rank ?? '', r2.Rank ?? '']);
  }

  const csv = out.map(row => row.map(csvEscape).join(',')).join('\n');
  fs.writeFileSync(OUT_CSV, csv);
  console.log('Saved:', OUT_CSV);
  console.log('q1:', q1);
  console.log('q2:', q2);
  console.log('only_q1:', only1.length, 'only_q2:', only2.length, 'both:', both.length);
})();
