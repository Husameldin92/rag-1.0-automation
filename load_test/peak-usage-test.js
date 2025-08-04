const https = require('https');
const fs = require('fs');
const path = require('path');

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

// API request function (same as before)
function makeAPIRequest(query, testNumber) {
  return new Promise((resolve, reject) => {
    const graphqlQuery = {
      query: `query ($question: String!) {
        discovery(question: $question) {
          results {
            _id
            title
            __typename
          }
          streamUrl
          mdMessage
          __typename
        }
      }`,
      variables: {
        question: query
      }
    };

    const data = JSON.stringify(graphqlQuery);

    const options = {
      hostname: 'concord.sandsmedia.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'User-Agent': `PeakUsageTest-${testNumber}`,
        'access-token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjAzZjkwMTU2ZjA3MWUzNTVmNGEiLCJpYXQiOjE3NTM5MTAzOTIsImV4cCI6MTc1NzM2NjM5Mn0.dEJLiXarAeB7HLq8DXKiAYATcGQhLL2PJwkvhvGj8A0'
      }
    };

    const startTime = Date.now();
    
    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        
        let parsedResponse = null;
        try {
          parsedResponse = JSON.parse(responseData);
        } catch (e) {
          // Keep raw response if not JSON
        }
        
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

    req.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        testNumber,
        statusCode: 0,
        duration,
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

// Generate random timing with clumps (not evenly distributed)
function generateRandomTimings(totalRequests, totalTimeMs) {
  const timings = [];
  
  // Create some clumps of activity
  const numClumps = Math.floor(totalRequests / 20) + 1; // Roughly 1 clump per 20 requests
  const clumpTimes = [];
  
  // Generate random clump start times
  for (let i = 0; i < numClumps; i++) {
    clumpTimes.push(Math.random() * totalTimeMs);
  }
  clumpTimes.sort((a, b) => a - b);
  
  // Assign requests to clumps or random times
  for (let i = 0; i < totalRequests; i++) {
    if (Math.random() < 0.6 && clumpTimes.length > 0) {
      // 60% chance to be in a clump
      const clumpIndex = Math.floor(Math.random() * clumpTimes.length);
      const clumpCenter = clumpTimes[clumpIndex];
      // Spread within ±5 seconds of clump center
      const offset = (Math.random() - 0.5) * 10000; // ±5 seconds
      timings.push(Math.max(0, Math.min(totalTimeMs, clumpCenter + offset)));
    } else {
      // 40% chance to be randomly distributed
      timings.push(Math.random() * totalTimeMs);
    }
  }
  
  return timings.sort((a, b) => a - b);
}

// Concurrency limiter
class ConcurrencyLimiter {
  constructor(maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.running = 0;
    this.queue = [];
  }
  
  async execute(asyncFunction) {
    return new Promise((resolve, reject) => {
      this.queue.push({ asyncFunction, resolve, reject });
      this.processQueue();
    });
  }
  
  async processQueue() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const { asyncFunction, resolve, reject } = this.queue.shift();
    
    try {
      const result = await asyncFunction();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.processQueue();
    }
  }
}

// Main peak usage test function
async function runPeakUsageTest() {
  const totalRequests = 400;
  const totalTimeMs = 60000; // 1 minute
  const maxConcurrent = 5;
  
  console.log(`🚀 Starting PEAK USAGE test:`);
  console.log(`   📊 ${totalRequests} requests over ${totalTimeMs/1000} seconds`);
  console.log(`   🔒 Max ${maxConcurrent} simultaneous requests`);
  console.log(`   🎲 Random distribution with natural clumps`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Create results directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const resultsDir = path.join(__dirname, 'results', `peak_usage_${timestamp}_${totalRequests}requests`);
  
  if (!fs.existsSync(path.join(__dirname, 'results'))) {
    fs.mkdirSync(path.join(__dirname, 'results'));
  }
  fs.mkdirSync(resultsDir);
  
  // Generate random timings
  const timings = generateRandomTimings(totalRequests, totalTimeMs);
  console.log(`⏰ Generated ${totalRequests} request timings:`);
  console.log(`   🎯 First request: ${Math.round(timings[0]/1000)}s`);
  console.log(`   🎯 Last request: ${Math.round(timings[timings.length-1]/1000)}s`);
  
  // Show timing distribution
  const timeSlots = Array(12).fill(0); // 12 slots of 5 seconds each
  timings.forEach(time => {
    const slot = Math.min(11, Math.floor(time / 5000));
    timeSlots[slot]++;
  });
  console.log(`\n📊 Request distribution (5-second windows):`);
  timeSlots.forEach((count, i) => {
    const start = i * 5;
    const end = (i + 1) * 5;
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`   ${start.toString().padStart(2)}s-${end.toString().padStart(2)}s: ${count.toString().padStart(3)} ${bar}`);
  });
  console.log('');

  const limiter = new ConcurrencyLimiter(maxConcurrent);
  const results = [];
  const startTime = Date.now();
  
  // Schedule all requests
  const scheduledRequests = timings.map((timing, index) => {
    const testNumber = index + 1;
    const question = questions[(index) % questions.length];
    
    return {
      timing,
      testNumber,
      question,
      promise: null
    };
  });
  
  // Start the test
  console.log(`🎬 Starting requests...`);
  const testStartTime = Date.now();
  
  // Process requests as they become due
  let completedCount = 0;
  const activeRequests = new Map();
  
  for (const request of scheduledRequests) {
    // Wait until it's time for this request
    const elapsedTime = Date.now() - testStartTime;
    const waitTime = request.timing - elapsedTime;
    
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Start the request with concurrency limiting
    const requestPromise = limiter.execute(async () => {
      const requestStartTime = new Date().toISOString();
      const actualStartTime = Date.now() - testStartTime;
      
      console.log(`🔄 [${Math.round(actualStartTime/1000).toString().padStart(2)}s] Request ${request.testNumber}/${totalRequests}: "${request.question.substring(0, 60)}..."`);
      
      const result = await makeAPIRequest(request.question, request.testNumber);
      result.requestTimestamp = requestStartTime;
      result.scheduledTime = request.timing;
      result.actualStartTime = actualStartTime;
      
      completedCount++;
      console.log(`${result.success ? '✅' : '❌'} [${Math.round(actualStartTime/1000).toString().padStart(2)}s] Request ${request.testNumber} ${result.success ? 'completed' : 'failed'} (${result.duration}ms) - ${completedCount}/${totalRequests} done`);
      
      return result;
    });
    
    // Don't wait for completion - let it run concurrently
    requestPromise.then(result => {
      results.push(result);
      
      // Save individual result file immediately
      const filename = `test_${result.testNumber.toString().padStart(3, '0')}.json`;
      const filepath = path.join(resultsDir, filename);
      
      const resultData = {
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
      };
      
      fs.writeFileSync(filepath, JSON.stringify(resultData, null, 2));
    }).catch(error => {
      console.error(`❌ Request ${request.testNumber} error:`, error);
    });
  }
  
  // Wait for all requests to complete
  console.log(`\n⏳ Waiting for all requests to complete...`);
  while (results.length < totalRequests) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const totalDuration = Date.now() - startTime;
  
  // Sort results by test number for consistent output
  results.sort((a, b) => a.testNumber - b.testNumber);
  
  // Files are saved in real-time as each request completes
  console.log(`\n💾 All result files saved in real-time during execution`);
  
  // Analyze results
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const timeouts504 = results.filter(r => r.is504).length;
  const otherErrors = failed - timeouts504;
  
  const successfulDurations = results.filter(r => r.success).map(r => r.duration);
  const avgDuration = successfulDurations.length > 0 ? 
    successfulDurations.reduce((sum, d) => sum + d, 0) / successfulDurations.length : 0;
  const maxDuration = successfulDurations.length > 0 ? Math.max(...successfulDurations) : 0;
  const minDuration = successfulDurations.length > 0 ? Math.min(...successfulDurations) : 0;
  
  // Print results
  console.log(`\n🎯 PEAK USAGE TEST RESULTS:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Total Requests: ${totalRequests}`);
  console.log(`✅ Successful: ${successful} (${(successful/totalRequests*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${(failed/totalRequests*100).toFixed(1)}%)`);
  console.log(`   └─ 504 Timeouts: ${timeouts504}`);
  console.log(`   └─ Other Errors: ${otherErrors}`);
  console.log(`⏱️  Total Test Time: ${Math.round(totalDuration/1000)}s`);
  console.log(`🔥 Fastest Response: ${minDuration}ms`);
  console.log(`🐌 Slowest Response: ${maxDuration}ms`);
  console.log(`📈 Average Response: ${Math.round(avgDuration)}ms`);
  
  console.log(`\n💾 FILES SAVED:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📁 Results directory: ${resultsDir}`);
  console.log(`📄 Individual files: test_001.json to test_${totalRequests.toString().padStart(3, '0')}.json`);
  console.log(`🔍 Each file contains: query, response, timing, status, 504 flag`);
  
  // Show timing accuracy
  const timingAccuracies = results.map(r => r.actualStartTime - r.scheduledTime);
  const avgTimingAccuracy = timingAccuracies.reduce((sum, acc) => sum + Math.abs(acc), 0) / timingAccuracies.length;
  console.log(`\n⏰ TIMING ACCURACY:`);
  console.log(`   📐 Average timing deviation: ${Math.round(avgTimingAccuracy)}ms`);
  
  // Show 504 handling note
  if (timeouts504 > 0) {
    console.log(`\n🔄 504 GATEWAY TIMEOUTS:`);
    console.log(`   ⚠️  ${timeouts504} requests received 504 Gateway Timeout`);
    console.log(`   ✅ This is expected under peak load`);
    console.log(`   🎯 UI should handle these gracefully (as designed)`);
  }
  
  // Performance assessment
  const successRate = (successful / totalRequests) * 100;
  console.log(`\n📋 PEAK USAGE ASSESSMENT:`);
  if (successRate >= 95) {
    console.log(`   🎉 EXCELLENT: ${successRate.toFixed(1)}% success rate under peak load`);
  } else if (successRate >= 90) {
    console.log(`   ✅ GOOD: ${successRate.toFixed(1)}% success rate under peak load`);
  } else if (successRate >= 80) {
    console.log(`   ⚠️  MODERATE: ${successRate.toFixed(1)}% success rate - consider scaling`);
  } else {
    console.log(`   ❌ POOR: ${successRate.toFixed(1)}% success rate - immediate attention needed`);
  }
}

// Run the peak usage test
runPeakUsageTest().catch(console.error);