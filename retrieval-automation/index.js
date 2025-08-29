const fs = require('fs');
const path = require('path');
const https = require('https');
const { parse } = require('csv-parse/sync');
const XLSX = require('xlsx');

// ------------------------------
// CLI ARGS (minimal parsing)
// ------------------------------
function getArg(flag, def) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];
  return def;
}

const endpointOpArg = getArg('--endpoint', 'discoveryTest'); // 'discover' | 'discoveryTest' | 'both'
const apiUrl = getArg('--url', 'https://concord.sandsmedia.com/graphql');
const languagesArg = getArg('--languages', 'en,de,nl'); // comma-separated: en,de,nl
const outDir = getArg('--outDir', path.join(__dirname, 'results'));
const explicitToken = getArg('--token', undefined);
const DEFAULT_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2N2E5YjNiYTJlZDBmZTA3Mjk3NDg5NjQiLCJpYXQiOjE3NTYxMTkyNzQsImV4cCI6MTc1OTU3NTI3NH0.zk0FU1APcn3n-9pVcsq6p57aJgJm108V04aCDDZzgWg';
const debug = getArg('--debug', 'false') === 'true';
const saveRaw = getArg('--saveRaw', 'true') === 'true';
const verbose = getArg('--verbose', 'true') === 'true';
const useManual = true; 

// ------------------------------
// Questions list
// ------------------------------
const QUESTIONS_MANUAL = [
  { id: 'API London', en: 'When is next APICon London happening?', de: 'Wann findet die nächste APICon London statt?', nl: 'Wanneer vindt de volgende APICon London plaats?' },
  { id: 'API New York', en: 'When is next APICon New York happening?', de: 'Wann findet die nächste APICon New York statt?', nl: 'Wanneer vindt de volgende APICon New York plaats?' },
  { id: 'BASTA! Herbst', en: 'When is next BASTA! Herbst happening?', de: 'Wann findet die nächste BASTA! Herbst statt?', nl: 'Wanneer vindt de volgende BASTA! Herbst plaats?' },
  { id: 'BASTA! Spring', en: 'When is next BASTA! Spring happening?', de: 'Wann findet die nächste BASTA! Spring statt?', nl: 'Wanneer vindt die volgende BASTA! Spring plaats?' },
  { id: 'Delphi Code Camp Duesseldorf', en: 'When is next Delphi Code Camp Duesseldorf happening?', de: 'Wann findet die nächste Delphi Code Camp Düsseldorf statt?', nl: 'Wanneer vindt de volgende Delphi Code Camp Duesseldorf plaats?' },
  { id: 'DevOps Training Docker', en: 'When is next DevOps Training Docker happening?', de: 'Wann findet die nächste DevOps Training Docker statt?', nl: 'Wanneer vindt de volgende DevOps Training Docker plaats?' },
  { id: 'DevOps Training Kubernetes', en: 'When is next DevOps Training Kubernetes happening?', de: 'Wann findet die nächste DevOps Training Kubernetes statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes plaats?' },
  { id: 'DevOps Training Kubernetes Advanced', en: 'When is next DevOps Training Kubernetes Advanced happening?', de: 'Wann findet die nächste DevOps Training Kubernetes Advanced statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes Advanced plaats?' },
  { id: 'DevOps Training Kubernetes Master', en: 'When is next DevOps Training Kubernetes Master happening?', de: 'Wann findet die nächste DevOps Training Kubernetes Master statt?', nl: 'Wanneer vindt de volgende DevOps Training Kubernetes Master plaats?' },
  { id: 'DevOps Training Monitoring', en: 'When is next DevOps Training Monitoring happening?', de: 'Wann findet die nächste DevOps Training Monitoring statt?', nl: 'Wanneer vindt de volgende DevOps Training Monitoring plaats?' },
  { id: 'DevOps Training Service Mesh', en: 'When is next DevOps Training Service Mesh happening?', de: 'Wann findet die nächste DevOps Training Service Mesh statt?', nl: 'Wanneer vindt de volgende DevOps Training Service Mesh plaats?' },
  { id: 'DevOpsCon Berlin', en: 'When is next DevOpsCon Berlin happening?', de: 'Wann findet die nächste DevOpsCon Berlin statt?', nl: 'Wanneer vindt de volgende DevOpsCon Berlijn plaats?' },
  { id: 'DevOpsCon London', en: 'When is next DevOpsCon London happening?', de: 'Wann findet die nächste DevOpsCon London statt?', nl: 'Wanneer vindt de volgende DevOpsCon London plaats?' },
  { id: 'DevOpsCon Munich', en: 'When is next DevOpsCon Munich happening?', de: 'Wann findet die nächste DevOpsCon München statt?', nl: 'Wanneer vindt die volgende DevOpsCon München plaats?' },
  { id: 'DevOpsCon New York', en: 'When is next DevOpsCon New York happening?', de: 'Wann findet die nächste DevOpsCon New York statt?', nl: 'Wanneer vindt de volgende DevOpsCon New York plaats?' },
  { id: 'DevOpsCon San Diego, CA', en: 'When is next DevOpsCon San Diego, CA happening?', de: 'Wann findet die nächste DevOpsCon San Diego, CA statt?', nl: 'Wanneer vindt de volgende DevOpsCon San Diego, CA plaats?' },
  { id: 'DevOpsCon Singapore', en: 'When is next DevOpsCon Singapore happening?', de: 'Wann findet die nächste DevOpsCon Singapore statt?', nl: 'Wanneer vindt de volgende DevOpsCon Singapore plaats?' },
  { id: 'EKON', en: 'When is next EKON happening?', de: 'Wann findet die nächste EKON statt?', nl: 'Wanneer vindt de volgende EKON plaats?' },
  { id: 'entwickler summit', en: 'When is next entwickler summit happening?', de: 'Wann findet der nächste entwickler summit statt?', nl: 'Wanneer vindt die volgende entwickler summit plaats?' },
  { id: 'Extreme Java Camp Flexible Design Patterns', en: 'When is next Extreme Java Camp Flexible Design Patterns happening?', de: 'Wann findet die nächste Extreme Java Camp Flexible Design Patterns statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Flexible Design Patterns plaats?' },
  { id: 'Extreme Java Camp Flexible Java Threads', en: 'When is next Extreme Java Camp Flexible Java Threads happening?', de: 'Wann findet die nächste Extreme Java Camp Flexible Java Threads statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Flexible Java Threads plaats?' },
  { id: 'Extreme Java Camp Java 11 und 17 meistern', en: 'When is next Extreme Java Camp Java 11 und 17 meistern happening?', de: 'Wann findet die nächste Extreme Java Camp Java 11 und 17 meistern statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Java 11 und 17 meistern plaats?' },
  { id: 'Extreme Java Camp Refactoring und Design Pattern', en: 'When is next Extreme Java Camp Refactoring und Design Pattern happening?', de: 'Wann findet die nächste Extreme Java Camp Refactoring und Design Pattern statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Refactoring und Design Pattern plaats?' },
  { id: 'Extreme Java Camp Themeninhalte', en: 'When is next Extreme Java Camp Themeninhalte happening?', de: 'Wann findet die nächste Extreme Java Camp Themeninhalte statt?', nl: 'Wanneer vindt die volgende Extreme Java Camp Themeninhalte plaats?' },
  { id: 'iJS London', en: 'When is next iJS London happening?', de: 'Wann findet die nächste iJS London statt?', nl: 'Wanneer vindt die volgende iJS London plaats?' },
  { id: 'iJS Munich', en: 'When is next iJS Munich happening?', de: 'Wann findet die nächste iJS München statt?', nl: 'Wanneer vindt die volgende iJS München plaats?' },
  { id: 'iJS New York', en: 'When is next iJS New York happening?', de: 'Wann findet die nächste iJS New York statt?', nl: 'Wanneer vindt die volgende iJS New York plaats?' },
  { id: 'iJS San Diego, CA', en: 'When is next iJS San Diego, CA happening?', de: 'Wann findet die nächste iJS San Diego, CA statt?', nl: 'Wanneer vindt die volgende iJS San Diego, CA plaats?' },
  { id: 'iJS Singapore', en: 'When is next iJS Singapore happening?', de: 'Wann findet die nächste iJS Singapore statt?', nl: 'Wanneer vindt die volgende iJS Singapore plaats?' },
  { id: 'IoT Con Munich', en: 'When is next IoT Con Munich happening?', de: 'Wann findet die nächste IoT Con München statt?', nl: 'Wanneer vindt die volgende IoT Con München plaats?' },
  { id: 'International PHP Conference Berlin', en: 'When is next International PHP Conference Berlin happening?', de: 'Wann findet die nächste International PHP Conference Berlin statt?', nl: 'Wanneer vindt die volgende International PHP Conference Berlijn plaats?' },
  { id: 'International PHP Conference Munich', en: 'When is next International PHP Conference Munich happening?', de: 'Wann findet die nächste International PHP Conference München statt?', nl: 'Wanneer vindt die volgende International PHP Conference München plaats?' },
  { id: 'IT Security Camp on site', en: 'When is next IT Security Camp on site happening?', de: 'Wann findet die nächste IT Security Camp on site statt?', nl: 'Wanneer vindt die volgende IT Security Camp on site plaats?' },
  { id: 'IT Security Camp remote', en: 'When is next IT Security Camp remote happening?', de: 'Wann findet die nächste IT Security Camp remote statt?', nl: 'Wanneer vindt die volgende IT Security Camp remote plaats?' },
  { id: 'IT Security Summit BER', en: 'When is next IT Security Summit BER happening?', de: 'Wann findet der nächste IT Security Summit BER statt?', nl: 'Wanneer vindt die volgende IT Security Summit BER plaats?' },
  { id: 'IT Security Summit MUE', en: 'When is next IT Security Summit MUE happening?', de: 'Wann findet der nächste IT Security Summit MUE statt?', nl: 'Wanneer vindt die volgende IT Security Summit MUE plaats?' },
  { id: 'JavaCamp Munich', en: 'When is next JavaCamp Munich happening?', de: 'Wann findet die nächste JavaCamp München statt?', nl: 'Wanneer vindt die volgende JavaCamp München plaats?' },
  { id: 'JavaScript Days Berlin', en: 'When is next JavaScript Days Berlin happening?', de: 'Wann findet die nächste JavaScript Days Berlin statt?', nl: 'Wanneer vindt die volgende JavaScript Days Berlijn plaats?' },
  { id: 'JavaScript Days München', en: 'When is next JavaScript Days Munich happening?', de: 'Wann findet die nächste JavaScript Days München statt?', nl: 'Wanneer vindt die volgende JavaScript Days München plaats?' },
  { id: 'JAX', en: 'When is next JAX happening?', de: 'Wann findet die nächste JAX statt?', nl: 'Wanneer vindt die volgende JAX plaats?' },
  { id: 'W-JAX', en: 'When is next W-JAX happening?', de: 'Wann findet die nächste W-JAX statt?', nl: 'Wanneer vindt die volgende W-JAX plaats?' },
  { id: 'JAX London', en: 'When is next JAX London happening?', de: 'Wann findet die nächste JAX London statt?', nl: 'Wanneer vindt die volgende JAX London plaats?' },
  { id: 'JAX Microservices Camp', en: 'When is next JAX Microservices Camp happening?', de: 'Wann findet die nächste JAX Microservices Camp statt?', nl: 'Wanneer vindt die volgende JAX Microservices Camp plaats?' },
  { id: 'JAX New York', en: 'When is next JAX New York happening?', de: 'Wann findet die nächste JAX New York statt?', nl: 'Wanneer vindt die volgende JAX New York plaats?' },
  { id: 'MAD Summit Berlin', en: 'When is next MAD Summit Berlin happening?', de: 'Wann findet die nächste MAD Summit Berlin statt?', nl: 'Wanneer vindt die volgende MAD Summit Berlijn plaats?' },
  { id: 'MAD Summit München', en: 'When is next MAD Summit Munich happening?', de: 'Wann findet die nächste MAD Summit München statt?', nl: 'Wanneer vindt die volgende MAD Summit München plaats?' },
  { id: 'ML Conference Berlin', en: 'When is next ML Conference Berlin happening?', de: 'Wann findet die nächste ML Conference Berlin statt?', nl: 'Wanneer vindt die volgende ML Conference Berlijn plaats?' },
  { id: 'MLcon GenAI Camp', en: 'When is next MLcon GenAI Camp happening?', de: 'Wann findet die nächste MLcon GenAI Camp statt?', nl: 'Wanneer vindt die volgende MLcon GenAI Camp plaats?' },
  { id: 'MLcon London', en: 'When is next MLcon London happening?', de: 'Wann findet die nächste MLcon London statt?', nl: 'Wanneer vindt die volgende MLcon London plaats?' },
  { id: 'ML Conference Munich', en: 'When is next ML Conference Munich happening?', de: 'Wann findet die nächste ML Conference München statt?', nl: 'Wanneer vindt die volgende ML Conference München plaats?' },
  { id: 'ML Con New York', en: 'When is next ML Con New York happening?', de: 'Wann findet die nächste ML Con New York statt?', nl: 'Wanneer vindt die volgende ML Con New York plaats?' },
  { id: 'MLcon - San Diego', en: 'When is next MLcon - San Diego happening?', de: 'Wann findet die nächste MLcon - San Diego statt?', nl: 'Wanneer vindt die volgende MLcon - San Diego plaats?' },
  { id: 'ML Con Singapore', en: 'When is next ML Con Singapore happening?', de: 'Wann findet die nächste ML Con Singapore statt?', nl: 'Wanneer vindt die volgende ML Con Singapore plaats?' },
  { id: 'KI und .NET Camp online', en: 'When is next KI und .NET Camp online happening?', de: 'Wann findet die nächste KI und .NET Camp online statt?', nl: 'Wanneer vindt die volgende KI und .NET Camp online plaats?' },
  { id: 'SLA Berlin', en: 'When is next SLA Berlin happening?', de: 'Wann findet die nächste SLA Berlin statt?', nl: 'Wanneer vindt die volgende SLA Berlijn plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul ADOC', en: 'When is next Modul ADOC happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul ADOC statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul ADOC plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul AGILA', en: 'When is next Modul AGILA happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul AGILA statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul AGILA plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul ARCEVAL', en: 'When is next Modul ARCEVAL happening?', de: 'Wann findet die nächste Software Architecture Camp - Advanced Modul ARCEVAL statt?', nl: 'Wanneer vindt die volgende Software Architecture Camp - Advanced Modul ARCEVAL plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul CLOUDINFRA', en: 'When is next Advanced Modul CLOUDINFRA happening?', de: 'Wann findet die nächste Advanced Modul CLOUDINFRA statt?', nl: 'Wanneer vindt die volgende Advanced Modul CLOUDINFRA plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul DDD', en: 'When is next Advanced Modul DDD happening?', de: 'Wann findet die nächste Advanced Modul DDD statt?', nl: 'Wanneer vindt die volgende Advanced Modul DDD plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul DSL', en: 'When is next Advanced Modul DSL happening?', de: 'Wann findet die nächste Advanced Modul DSL statt?', nl: 'Wanneer vindt die volgende Advanced Modul DSL plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul FLEX', en: 'When is next Advanced Modul FLEX happening?', de: 'Wann findet die nächste Advanced Modul FLEX statt?', nl: 'Wanneer vindt die volgende Advanced Modul FLEX plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul FUNAR', en: 'When is next Advanced Modul FUNAR happening?', de: 'Wann findet die nächste Advanced Modul FUNAR statt?', nl: 'Wanneer vindt die volgende Advanced Modul FUNAR plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul IMPROVE', en: 'When is next Advanced Modul IMPROVE happening?', de: 'Wann findet die nächste Advanced Modul IMPROVE statt?', nl: 'Wanneer vindt die volgende Advanced Modul IMPROVE plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul SOFT', en: 'When is next Advanced Modul SOFT happening?', de: 'Wann findet die nächste Advanced Modul SOFT statt?', nl: 'Wanneer vindt die volgende Advanced Modul SOFT plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul SWARC4AI', en: 'When is next Advanced Modul SWARC4AI happening?', de: 'Wann findet die nächste Advanced Modul SWARC4AI statt?', nl: 'Wanneer vindt die volgende Advanced Modul SWARC4AI plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul WEB', en: 'When is next Advanced Modul WEB happening?', de: 'Wann findet die nächste Advanced Modul WEB statt?', nl: 'Wanneer vindt die volgende Advanced Modul WEB plaats?' },
  { id: 'Software Architecture Camp - Advanced Modul WEBSEC', en: 'When is next Advanced Modul WEBSEC happening?', de: 'Wann findet die nächste Advanced Modul WEBSEC statt?', nl: 'Wanneer vindt die volgende Advanced Modul WEBSEC plaats?' },
  { id: 'Software Architecture Camp - Foundation', en: 'When is next Foundation happening?', de: 'Wann findet die nächste Foundation statt?', nl: 'Wanneer vindt die volgende Foundation plaats?' },
  { id: 'Software Architecture Summit Berlin', en: 'When is next Software Architecture Summit Berlin happening?', de: 'Wann findet die nächste Software Architecture Summit Berlin statt?', nl: 'Wanneer vindt die volgende Software Architecture Summit Berlijn plaats?' },
  { id: 'Software Architecture Summit München', en: 'When is next Software Architecture Summit Munich happening?', de: 'Wann findet die nächste Software Architecture Summit München statt?', nl: 'Wanneer vindt die volgende Software Architecture Summit München plaats?' },
  { id: 'webinale', en: 'When is next webinale happening?', de: 'Wann findet die nächste webinale statt?', nl: 'Wanneer vindt die volgende webinale plaats?' },
  { id: 'Web Security Camp', en: 'When is next Web Security Camp happening?', de: 'Wann findet die nächste Web Security Camp statt?', nl: 'Wanneer vindt die volgende Web Security Camp plaats?' }
];

// CSV mode removed (manual list only)

// Token from CLI or existing environment variable
const token = explicitToken || process.env.ACCESS_TOKEN || DEFAULT_TOKEN;
if (!token) {
  console.error('❌ Missing ACCESS_TOKEN. Provide via .env or --token.');
  process.exit(1);
}

// Validate op
if (!['discover', 'discoveryTest', 'both'].includes(endpointOpArg)) {
  console.error('❌ --endpoint must be "discover", "discoveryTest" or "both"');
  process.exit(1);
}

// ------------------------------
// Helpers
// ------------------------------
function readCsvRecords(filePath) {
  // CSV mode removed; keeping stub to avoid references
  return [];
}

function buildQuery(op) {
  // Request only fields we need to minimize payload
  if (op === 'discoveryTest') {
    return `query DiscoveryTest($question: String) {\n  discoveryTest(question: $question) {\n    keywords\n    results {\n      _id\n      title\n      parentGenre\n      contentType\n      indexBrandName\n      indexSeriesName\n      score\n      sortDate\n    }\n  }\n}`;
  }
  return `query ($question: String!) {\n  ${op}(question: $question) {\n    results {\n      _id\n      title\n      parentGenre\n      contentType\n      indexBrandName\n      indexSeriesName\n      score\n      sortDate\n    }\n  }\n}`;
}

function postGraphQL({ url, token, query, variables }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ query, variables });
    const { hostname, pathname, protocol } = new URL(url);

    const options = {
      hostname,
      port: protocol === 'https:' ? 443 : 80,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'retrieval-automation/1.0',
        'access-token': token
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: { raw: data } });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runForEndpoint(op) {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const languages = languagesArg.split(',').map(s => s.trim()).filter(Boolean);
  const queryString = buildQuery(op);
  const rows = [];
  const total = QUESTIONS_MANUAL.length * languages.length;
  let processed = 0;

  for (const rec of QUESTIONS_MANUAL) {
    const questionId = rec.id;
    for (const lang of languages) {
      const question = rec[lang];
      if (!question) continue;

      const t0 = Date.now();
      const { status, data } = await postGraphQL({ url: apiUrl, token, query: queryString, variables: { question } });
      const ms = Date.now() - t0;
      processed++;
      if (getArg('--verbose', 'true') === 'true') {
        console.log(`${status === 200 ? '✅' : '❌'} ${op} ${processed}/${total} | ${questionId} [${lang}] (${ms}ms)`);
      }

      const container = (data && data.data && data.data[op]) || { results: [] };
      const results = Array.isArray(container.results) ? container.results : [];
      for (const item of results) {
        if (op === 'discoveryTest') {
          rows.push({
            questionId,
            endpoint: op,
            language: lang,
            question,
            _id: item._id || '',
            title: item.title || '',
            parentGenre: item.parentGenre || '',
            contentType: item.contentType || '',
            indexBrandName: item.indexBrandName || '',
            indexSeriesName: item.indexSeriesName || '',
            score: typeof item.score === 'number' ? item.score : '',
            sortDate: item.sortDate || ''
          });
        } else {
          rows.push({
            questionId,
            endpoint: op,
            language: lang,
            question,
            _id: item._id || '',
            title: item.title || '',
            parentGenre: item.parentGenre || '',
            contentType: item.contentType || '',
            indexBrandName: item.indexBrandName || '',
            indexSeriesName: item.indexSeriesName || '',
            score: typeof item.score === 'number' ? item.score : '',
            sortDate: item.sortDate || ''
          });
        }
      }
    }
  }

  if (getArg('--debug', 'false') === 'true') {
    console.log(`ℹ️  Collected rows: ${rows.length}`);
  }

  // Rename _id -> POC_Id for Excel output only (JSON keeps _id)
  const excelRows = rows.map(r => {
    const { _id, ...rest } = r;
    return { POC_Id: _id || '', ...rest };
  });
  const worksheet = XLSX.utils.json_to_sheet(excelRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'results');

  const ts = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const outFile = path.join(outDir, `${op}_${ts}.xlsx`);
  XLSX.writeFile(workbook, outFile);
  console.log(`✅ Saved: ${outFile}`);

  if (getArg('--saveRaw', 'true') === 'true') {
    const rawDir = path.join(outDir, 'json');
    if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
    const rawPath = path.join(rawDir, `${op}_${ts}.json`);
    fs.writeFileSync(rawPath, JSON.stringify({ endpoint: op, url: apiUrl, questionMode: 'manual', languages, rows }, null, 2));
    if (getArg('--debug', 'false') === 'true') console.log(`📝 Raw saved: ${rawPath}`);
  }
}

async function main() {
  if (endpointOpArg === 'both') {
    await runForEndpoint('discoveryTest');
    await runForEndpoint('discover');
  } else {
    await runForEndpoint(endpointOpArg);
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});


