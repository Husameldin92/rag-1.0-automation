const https = require('https');
const fs = require('fs');
const path = require('path');

// =======================
// Config
// =======================

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

// >>> Replace with your real tokens (15 tokens = 300 req)
// One token = one user. Each user sends 20 req in their 4s slot.
const TOKENS = [
  'TOKEN_USER_1',
  'TOKEN_USER_2',
  'TOKEN_USER_3',
  'TOKEN_USER_4',
  'TOKEN_USER_5',
  'TOKEN_USER_6',
  'TOKEN_USER_7',
  'TOKEN_USER_8',
  'TOKEN_USER_9',
  'TOKEN_USER_10',
  'TOKEN_USER_11',
  'TOKEN_USER_12',
  'TOKEN_USER_13',
  'TOKEN_USER_14',
  'TOKEN_USER_15'
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

    // Hard timeout per request (10s)
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        testNumber,
        statusCode: null,
        duration: 10000,
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
  const slots = Math.min(tokens.length, 15); // 15 slots × 4s = 60s
  let testNumber = 1;

  for (let slot = 0; slot < slots; slot++) {
    const token = tokens[slot];
    const baseSec = slot * 4; // 0,4,8,...,56

    for (let s = 0; s < 4; s++) {
      const sec = baseSec + s;
      // 5 unique ms offsets in [0..999]
      const used = new Set();
      while (used.size < 5) used.add(Math.floor(Math.random() * 1000));
      for (const msOffset of used) {
        items.push({
          timing: sec * 1000 + msOffset,
          token,
          question: questions[(testNumber - 1) % questions.length],
          testNumber: testNumber++
        });
      }
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
  console.log(`🧩 Using per-token schedule: ${TOKENS.length} users × 20 req = ${schedule.length} requests (60s window, max 5/sec).`);

  // Quick distribution report
  console.log(`   🎯 First req at: ${Math.round(timingsForReport[0] / 1000)}s`);
  console.log(`   🎯 Last  req at: ${Math.round(timingsForReport[timingsForReport.length - 1] / 1000)}s`);
  const secondCounts = Array(60).fill(0);
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
