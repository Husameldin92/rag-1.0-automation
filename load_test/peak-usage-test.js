const https = require('https');
const fs = require('fs');
const path = require('path');

// =======================
// Config
// =======================

// Rate/configuration
const REQUESTS_PER_SECOND = 3;       // Global rate cap per active token
const REQUESTS_PER_TOKEN = 20;       // Each token sends this many requests
const SLOT_SECONDS_PER_TOKEN = Math.ceil(REQUESTS_PER_TOKEN / REQUESTS_PER_SECOND);

const questions = [
  'What are the main features of Angular Signals in version 17?',
  'Tell me about React useEffect from tutorials only.',
  'Can you summarize recent events on DevOps from articles?',
  'What are some common mistakes in Dockerfile configuration?',
  "What's up?",
  "Angular better?",
  'Give me something cool about tech.',
  'How do I use Signals in Angular 13?',
  'What changed in Angular 17 Signals?',
  'Explain Observables in Angular 15.',
  'How does Angular handle routing?',
  'How does Next.js handle dynamic routing?',
  "What's new in React 18 hooks?",
  'How does useMemo work in React?',
  "What's the best way to manage state in Vue.js?",
  'How to implement microservices in Node.js?',
  'Show me events about Kubernetes.',
  'Link me a course about Docker on Coursera.',
  'What does Medium say about async/await?',
  'Give me an article about TypeScript types.',
  "I'm a backend developer. Show me relevant tutorials.",
  'How do I implement GraphQL caching?',
  'Best practices for React performance optimization?',
  'How to deploy Angular apps to production?',
  'What is the difference between REST and GraphQL?',
  'Modern CSS techniques for responsive design',
  'JavaScript async patterns explained',
  'Docker vs Kubernetes: when to use what?',
  'Vue.js 3 Composition API tutorial',
  'Node.js security best practices'
];


// One token = one user. Each user sends 20 req in their 4s slot.
const TOKENS = [
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjAzZjkwMTU2ZjA3MWUzNTVmNGEiLCJpYXQiOjE3NTQzODgwMzEsImV4cCI6MTc1Nzg0NDAzMX0.L_9jzE5_BzisB_fIS0Fd-dU6F2UiDSC-flYo6_lwrNo',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjBmYjkwMTU2ZjA3MWUzNTgxZWYiLCJpYXQiOjE3NTM4MDE0OTAsImV4cCI6MTc1NzI1NzQ5MH0.wUtgAQKEY17AW2Mw7D7atax6VrIpBhLOeODjRs3Eo6U',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjExNjFlMmRjNTA3MmFhODQ4MjciLCJpYXQiOjE3NTQ2MzY0NzgsImV4cCI6MTc1ODA5MjQ3OH0.MKB6X6XhLG_qc3JAWSZO9BrRVDJApkU69O2_Dgt0_IE',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjEyZDFlMmRjNTA3MmFhODRiYzkiLCJpYXQiOjE3NTQzMDA4NjksImV4cCI6MTc1Nzc1Njg2OX0.0M61qah1aunGsv6DxirmuZktURwP85_hFp7KjmdZ8Vw',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjEzZTkwMTU2ZjA3MWUzNThiODYiLCJpYXQiOjE3NTM4MDEzNjgsImV4cCI6MTc1NzI1NzM2OH0.FicnOHXkg4xATARbqJ6MYxl0NmylJpkIP-HYhy48gUI',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjE4MmQwOTM2OTA3NDQ3NDI1YzEiLCJpYXQiOjE3NTM4MDEzNzMsImV4cCI6MTc1NzI1NzM3M30.E6_1kpFEVYEbXFfAMPXK89ETMV58ouqQwNbIKlWUduM',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjE5OTkwMTU2ZjA3MWUzNTk4MGUiLCJpYXQiOjE3NTM4MDEzNzUsImV4cCI6MTc1NzI1NzM3NX0.FfMsjEIm8ajifLaGg2v_FFmNZ-EHETAG28x3iKkN4KE',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjFhY2QwOTM2OTA3NDQ3NDJhZjMiLCJpYXQiOjE3NTM4MDEzNzUsImV4cCI6MTc1NzI1NzM3NX0.H9HkWJ9DyKzylsCnxpWBEMhO0M5f1619fLfL1n1MWy0',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjFjMTkwMTU2ZjA3MWUzNTlkNzgiLCJpYXQiOjE3NTM4MDEzODksImV4cCI6MTc1NzI1NzM4OX0.U0S9TN6xy0D_GbLCIg8IAx2NC5I3_w0E4McS9Gb-CE4',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjFkMzkwMTU2ZjA3MWUzNWEwMzAiLCJpYXQiOjE3NTQyOTM0ODQsImV4cCI6MTc1Nzc0OTQ4NH0._rJRhODW-vY7vTh9er_yU6m0pwYKydgj1ssADPxA4lM',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2N2E5YjNiYTJlZDBmZTA3Mjk3NDg5NjQiLCJpYXQiOjE3NTQ2NjI2ODMsImV4cCI6MTc1ODExODY4M30.EB_lfWtn6vD6KPbuqHNH3HFEiwK1wMvG12nLjCJTi3s',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjAzZjkwMTU2ZjA3MWUzNTVmNGEiLCJpYXQiOjE3NTQzODgwMzEsImV4cCI6MTc1Nzg0NDAzMX0.L_9jzE5_BzisB_fIS0Fd-dU6F2UiDSC-flYo6_lwrNo',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjBmYjkwMTU2ZjA3MWUzNTgxZWYiLCJpYXQiOjE3NTM4MDE0OTAsImV4cCI6MTc1NzI1NzQ5MH0.wUtgAQKEY17AW2Mw7D7atax6VrIpBhLOeODjRs3Eo6U',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjExNjFlMmRjNTA3MmFhODQ4MjciLCJpYXQiOjE3NTQ2MzY0NzgsImV4cCI6MTc1ODA5MjQ3OH0.MKB6X6XhLG_qc3JAWSZO9BrRVDJApkU69O2_Dgt0_IE',
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjEyZDFlMmRjNTA3MmFhODRiYzkiLCJpYXQiOjE3NTQzMDA4NjksImV4cCI6MTc1Nzc1Njg2OX0.0M61qah1aunGsv6DxirmuZktURwP85_hFp7KjmdZ8Vw'
];

// HTTPS agent: keep-alive + more sockets
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 100 });

// =======================
// HTTP call
// =======================

function makeAPIRequest(query, testNumber, token) {
  return new Promise((resolve) => {
    const graphqlQuery = {
      query: `query ($question: String!) {
        discovery(question: $question) {
          results { _id title __typename }
          streamUrl
          mdMessage
          __typename
        }
      }`,
      variables: { question: query }
    };

    const data = JSON.stringify(graphqlQuery);

    const options = {
      hostname: 'concord.sandsmedia.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': `PeakUsageTest-${testNumber}`,
        'access-token': token
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        const duration = Date.now() - startTime;

        let parsedResponse = null;
        try { parsedResponse = JSON.parse(responseData); } catch (_) {}

        resolve({
          testNumber,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode === 200,
          responseSize: responseData.length,
          query: query.substring(0, 50) + '...',
          fullQuery: query,
          response: parsedResponse || responseData.substring(0, 500) + '...',
          is504: res.statusCode === 504
        });
      });
    });

    // Hard timeout per request (60s)
    req.setTimeout(60000, () => {
      req.destroy();
      const elapsed = Date.now() - startTime;
      resolve({
        testNumber,
        statusCode: null,
        duration: elapsed,
        success: false,
        error: 'timeout',
        query: query.substring(0, 50) + '...',
        fullQuery: query,
        is504: false
      });
    });

    req.on('error', (error) => {
      resolve({
        testNumber,
        statusCode: 0,
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
        query: query.substring(0, 50) + '...',
        fullQuery: query,
        is504: false
      });
    });

    req.write(data);
    req.end();
  });
}

// =======================
// Schedules
// =======================

// Integer timings (fallback): cap 5 per second, 0–59s
function generateIntegerTimings(totalRequests) {
  const maxPerSecond = 5;
  const maxPossibleRequests = 60 * maxPerSecond; // 300 max
  if (totalRequests > maxPossibleRequests) totalRequests = maxPossibleRequests;

  const timings = [];
  const usedTimings = new Set();

  for (let second = 0; second < 60; second++) {
    const toFill = Math.min(maxPerSecond, totalRequests - timings.length);
    for (let i = 0; i < toFill; i++) {
      let t;
      do {
        t = second * 1000 + Math.floor(Math.random() * 1000);
      } while (usedTimings.has(t));
      usedTimings.add(t);
      timings.push(t);
      if (timings.length >= totalRequests) break;
    }
    if (timings.length >= totalRequests) break;
  }

  // shuffle for randomness (clumps)
  for (let i = timings.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [timings[i], timings[j]] = [timings[j], timings[i]];
  }

  timings.sort((a, b) => a - b);
  return timings;
}

// Per-token schedule: each token gets a 4s slot, 5 req/sec => 20 req per token
function buildPerTokenSchedule(tokens, questions) {
  const items = [];
  const slots = tokens.length; // one slot per token
  let testNumber = 1;

  for (let slot = 0; slot < slots; slot++) {
    const token = tokens[slot];
    const baseSec = slot * SLOT_SECONDS_PER_TOKEN;
    let requestsGeneratedForToken = 0;

    for (let s = 0; s < SLOT_SECONDS_PER_TOKEN; s++) {
      const sec = baseSec + s;
      const remainingForToken = REQUESTS_PER_TOKEN - requestsGeneratedForToken;
      if (remainingForToken <= 0) break;

      // Up to REQUESTS_PER_SECOND requests this second, but not more than remaining
      const requestsThisSecond = Math.min(REQUESTS_PER_SECOND, remainingForToken);

      // Unique ms offsets in [0..999]
      const used = new Set();
      while (used.size < requestsThisSecond) used.add(Math.floor(Math.random() * 1000));
      for (const msOffset of used) {
        items.push({
          timing: sec * 1000 + msOffset,
          token,
          question: questions[(testNumber - 1) % questions.length],
          testNumber: testNumber++
        });
      }
      requestsGeneratedForToken += requestsThisSecond;
    }
  }

  items.sort((a, b) => a.timing - b.timing);
  return items;
}

// =======================
// Runner
// =======================

async function runPeakUsageTest() {
  const totalRequests = 400; // spec target (real cap is 300 by 5/sec rule)
  console.log(`🚀 Starting PEAK USAGE test (spec target: ${totalRequests} requests over 60s, max 5/sec).`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const resultsDir = path.join(__dirname, 'results', `peak_usage_${timestamp}`);
  if (!fs.existsSync(path.join(__dirname, 'results'))) fs.mkdirSync(path.join(__dirname, 'results'));
  fs.mkdirSync(resultsDir);

  const results = [];
  const startTime = Date.now();

  // Build schedule: strict per-token mode only
  let scheduledRequests = [];
  let timingsForReport = [];

  if (!Array.isArray(TOKENS) || TOKENS.length === 0) {
    throw new Error('TOKENS is empty. Provide your per-user access tokens.');
  }

  const schedule = buildPerTokenSchedule(TOKENS, questions);
  scheduledRequests = schedule.map(item => ({
    timing: item.timing,
    testNumber: item.testNumber,
    question: item.question,
    token: item.token
  }));
  timingsForReport = schedule.map(i => i.timing);
  const totalSeconds = (TOKENS.length * SLOT_SECONDS_PER_TOKEN);
  console.log(`🧩 Using per-token schedule: ${TOKENS.length} users × ${REQUESTS_PER_TOKEN} req = ${schedule.length} requests (~${totalSeconds}s window, max ${REQUESTS_PER_SECOND}/sec).`);

  // Quick distribution report
  console.log(`   🎯 First req at: ${Math.round(timingsForReport[0] / 1000)}s`);
  console.log(`   🎯 Last  req at: ${Math.round(timingsForReport[timingsForReport.length - 1] / 1000)}s`);
  const maxSecond = Math.floor(timingsForReport[timingsForReport.length - 1] / 1000);
  const secondCounts = Array(maxSecond + 1).fill(0);
  timingsForReport.forEach(t => { const s = Math.floor(t / 1000); if (secondCounts[s] !== undefined) secondCounts[s]++; });
  console.log(`\n📊 Requests per second (non-zero only):`);
  secondCounts.forEach((c, s) => { if (c > 0) console.log(`   ${s.toString().padStart(2)}s: ${c.toString().padStart(3)} ${'█'.repeat(c)}`); });
  console.log('');

  // Sort and run
  scheduledRequests.sort((a, b) => a.timing - b.timing);
  const actualTotalRequests = scheduledRequests.length;

  console.log(`🎬 Starting requests...`);
  const testStartTime = Date.now();
  let completedCount = 0;

  scheduledRequests.forEach(reqItem => {
    setTimeout(async () => {
      const actualStartTime = Date.now() - testStartTime;
      console.log(`🔄 [${Math.round(actualStartTime / 1000).toString().padStart(2)}s] #${reqItem.testNumber}: "${reqItem.question.substring(0, 60)}..."`);
      // Guard against missing token per item
      if (!reqItem.token) {
        completedCount++;
        const errorMsg = 'missing access token';
        console.log(`❌ [${Math.round((Date.now() - testStartTime) / 1000).toString().padStart(2)}s] #${reqItem.testNumber} error: ${errorMsg} - ${completedCount}/${actualTotalRequests}`);
        results.push({ testNumber: reqItem.testNumber, query: reqItem.question, success: false, error: errorMsg, duration: 0, scheduledTime: reqItem.timing, actualStartTime });
        return;
      }

      try {
        const result = await makeAPIRequest(reqItem.question, reqItem.testNumber, reqItem.token);
        result.requestTimestamp = new Date().toISOString();
        result.scheduledTime = reqItem.timing;
        result.actualStartTime = actualStartTime;

        completedCount++;
        console.log(`${result.success ? '✅' : '❌'} [${Math.round(actualStartTime / 1000).toString().padStart(2)}s] #${reqItem.testNumber} ${result.success ? 'ok' : 'fail'} (${result.duration}ms) - ${completedCount}/${actualTotalRequests}`);

        results.push(result);

        const filename = `test_${result.testNumber.toString().padStart(3, '0')}.json`;
        fs.writeFileSync(path.join(resultsDir, filename), JSON.stringify({
          testNumber: result.testNumber,
          query: result.fullQuery,
          statusCode: result.statusCode,
          success: result.success,
          duration: result.duration,
          responseSize: result.responseSize,
          timestamp: result.requestTimestamp,
          scheduledTime: result.scheduledTime,
          actualStartTime: result.actualStartTime,
          response: result.response,
          error: result.error || null,
          is504: result.is504 || false
        }, null, 2));

      } catch (error) {
        completedCount++;
        console.log(`❌ [${Math.round((Date.now() - testStartTime) / 1000).toString().padStart(2)}s] #${reqItem.testNumber} error: ${error.message} - ${completedCount}/${actualTotalRequests}`);
        results.push({ testNumber: reqItem.testNumber, query: reqItem.question, success: false, error: error.message, duration: 0, scheduledTime: reqItem.timing, actualStartTime });
      }
    }, reqItem.timing);
  });

  console.log(`\n⏳ Waiting for all requests to complete...`);
  while (results.length < actualTotalRequests) {
    await new Promise(r => setTimeout(r, 100));
  }

  const totalDuration = Date.now() - startTime;
  results.sort((a, b) => a.testNumber - b.testNumber);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const timeouts504 = results.filter(r => r.is504).length;
  const otherErrors = failed - timeouts504;

  const durations = results.filter(r => r.success).map(r => r.duration);
  const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : 0;
  const maxDuration = durations.length ? Math.max(...durations) : 0;
  const minDuration = durations.length ? Math.min(...durations) : 0;

  console.log(`\n🎯 PEAK USAGE TEST RESULTS:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total Requests: ${actualTotalRequests}`);
  console.log(`✅ Successful: ${successful} (${(successful / actualTotalRequests * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${(failed / actualTotalRequests * 100).toFixed(1)}%)`);
  console.log(`   └─ 504 Timeouts: ${timeouts504}`);
  console.log(`   └─ Other Errors: ${otherErrors}`);
  console.log(`⏱️  Total Test Time: ${Math.round(totalDuration / 1000)}s`);
  console.log(`🔥 Fastest Response: ${minDuration}ms`);
  console.log(`🐌 Slowest Response: ${maxDuration}ms`);
  console.log(`📈 Average Response: ${avgDuration}ms`);
  console.log(`📁 Results dir: ${resultsDir}`);
}

runPeakUsageTest().catch(console.error);
