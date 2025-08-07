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

// API request function
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

// Generate timing using integer assignment (0-59 seconds)
function generateIntegerTimings(totalRequests) {
  const maxPerSecond = 5;
  const maxPossibleRequests = 60 * maxPerSecond; // 300 max requests
  
  // Check if we can fit all requests with the constraint
  if (totalRequests > maxPossibleRequests) {
    console.log(`⚠️  WARNING: ${totalRequests} requests cannot fit in 60 seconds with max ${maxPerSecond} per second`);
    console.log(`   📊 Maximum possible: ${maxPossibleRequests} requests`);
    console.log(`   🔧 Reducing to ${maxPossibleRequests} requests to maintain constraint`);
    totalRequests = maxPossibleRequests;
  }
  
  const timings = [];
  
  // GUARANTEED UNIQUE TIMING APPROACH - No duplicates possible
  const usedTimings = new Set();
  
  // Fill each second with exactly 5 unique timings
  for (let second = 0; second < 60; second++) {
    const requestsForThisSecond = Math.min(5, totalRequests - timings.length);
    
    for (let i = 0; i < requestsForThisSecond; i++) {
      let uniqueTiming;
      let attempts = 0;
      
      // Keep generating until we get a unique timing
      do {
        const millisecondOffset = Math.floor(Math.random() * 1000);
        uniqueTiming = second * 1000 + millisecondOffset;
        attempts++;
        
        // Safety: if too many attempts, use sequential fallback
        if (attempts > 1000) {
          for (let fallback = 0; fallback < 1000; fallback++) {
            uniqueTiming = second * 1000 + fallback;
            if (!usedTimings.has(uniqueTiming)) break;
          }
          break;
        }
      } while (usedTimings.has(uniqueTiming));
      
      usedTimings.add(uniqueTiming);
      timings.push(uniqueTiming);
      
      // Stop if we've generated enough requests
      if (timings.length >= totalRequests) break;
    }
    
    if (timings.length >= totalRequests) break;
  }
  
  // Shuffle to randomize execution order while maintaining unique timings
  for (let i = timings.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [timings[i], timings[j]] = [timings[j], timings[i]];
  }
  
  // Verify final distribution
  const distributionCheck = Array(60).fill(0);
  timings.forEach(timing => {
    const second = Math.floor(timing / 1000);
    distributionCheck[second]++;
  });
  
  const maxActual = Math.max(...distributionCheck);
  const totalGenerated = timings.length;
  
  if (maxActual > maxPerSecond) {
    console.error(`❌ CONSTRAINT VIOLATION: Found ${maxActual} requests in a single second (max allowed: ${maxPerSecond})`);
    console.error(`   📊 Full distribution: ${distributionCheck}`);
    throw new Error('Constraint violation detected');
  }
  
  console.log(`✅ Constraint verification: Max per second = ${maxActual}/${maxPerSecond}`);
  console.log(`✅ Total requests generated: ${totalGenerated}/${totalRequests}`);
  console.log(`✅ Even distribution: [${distributionCheck.slice(0, 10).join(', ')}...]`);
  
  return timings.sort((a, b) => a - b);
}



// Main peak usage test function
async function runPeakUsageTest() {
  const totalRequests = 400;
  const totalTimeMs = 60000; // 1 minute
  
  console.log(`🚀 Starting PEAK USAGE test:`);
  console.log(`   📊 ${totalRequests} requests over ${totalTimeMs/1000} seconds`);
  console.log(`   🎲 Integer assignment (0-59s), max 5 per second`);
  console.log(`   ⚡ No artificial concurrency limits - real load testing`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // Create results directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const resultsDir = path.join(__dirname, 'results', `peak_usage_${timestamp}_${totalRequests}requests`);
  
  if (!fs.existsSync(path.join(__dirname, 'results'))) {
    fs.mkdirSync(path.join(__dirname, 'results'));
  }
  fs.mkdirSync(resultsDir);
  
  // Generate integer timings (0-59 seconds)
  const timings = generateIntegerTimings(totalRequests);
  const actualRequests = timings.length;
  console.log(`⏰ Generated ${actualRequests} request timings (integer assignment):`);
  console.log(`   🎯 First request: ${Math.round(timings[0]/1000)}s`);
  console.log(`   🎯 Last request: ${Math.round(timings[timings.length-1]/1000)}s`);
  
  // Show timing distribution per second (0-59)
  const secondCounts = Array(60).fill(0);
  timings.forEach(time => {
    const second = Math.floor(time / 1000);
    secondCounts[second]++;
  });
  
  console.log(`\n📊 Request distribution by second (showing non-zero seconds only):`);
  secondCounts.forEach((count, second) => {
    if (count > 0) {
      const bar = '█'.repeat(count);
      console.log(`   ${second.toString().padStart(2)}s: ${count.toString().padStart(3)} ${bar}`);
    }
  });
  
  const maxPerSecond = Math.max(...secondCounts);
  const secondsUsed = secondCounts.filter(count => count > 0).length;
  console.log(`   📈 Max requests in any second: ${maxPerSecond}`);
  console.log(`   📊 Total seconds used: ${secondsUsed}/60`);
  console.log('');

  const results = [];
  const startTime = Date.now();
  
  // Schedule all requests  
  const scheduledRequests = timings.map((timing, index) => {
    const testNumber = index + 1;
    const question = questions[(index) % questions.length];
    
    return {
      timing,
      testNumber,
      question
    };
  });
  
  // Sort by scheduled timing for proper execution order
  scheduledRequests.sort((a, b) => a.timing - b.timing);
  
  const actualTotalRequests = scheduledRequests.length;
  
  // Start the test
  console.log(`🎬 Starting requests...`);
  const testStartTime = Date.now();
  
  // Process requests as they become due
  let completedCount = 0;
  
  // Schedule all requests concurrently using setTimeout - NO SEQUENTIAL DELAYS
  scheduledRequests.forEach(request => {
    const delay = request.timing; // Direct delay from test start time
    
    setTimeout(async () => {
      // Start the request at exact scheduled time
      const requestStartTime = new Date().toISOString();
      const actualStartTime = Date.now() - testStartTime;
      
      console.log(`🔄 [${Math.round(actualStartTime/1000).toString().padStart(2)}s] Request ${request.testNumber}/${actualTotalRequests}: "${request.question.substring(0, 60)}..."`);
      
      try {
        const result = await makeAPIRequest(request.question, request.testNumber);
        result.requestTimestamp = requestStartTime;
        result.scheduledTime = request.timing;
        result.actualStartTime = actualStartTime;
        
        completedCount++;
        console.log(`${result.success ? '✅' : '❌'} [${Math.round(actualStartTime/1000).toString().padStart(2)}s] Request ${request.testNumber} ${result.success ? 'completed' : 'failed'} (${result.duration}ms) - ${completedCount}/${actualTotalRequests} done`);
        
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
        
      } catch (error) {
        completedCount++;
        console.log(`❌ [${Math.round((Date.now() - testStartTime)/1000).toString().padStart(2)}s] Request ${request.testNumber} failed (${error.message}) - ${completedCount}/${actualTotalRequests} done`);
        
        const result = {
          testNumber: request.testNumber,
          query: request.question,
          success: false,
          error: error.message,
          duration: 0,
          requestTimestamp: requestStartTime,
          scheduledTime: request.timing,
          actualStartTime: actualStartTime
        };
        
        results.push(result);
      }
    }, delay);
  });
  
  // Wait for all requests to complete
  console.log(`\n⏳ Waiting for all requests to complete...`);
  while (results.length < actualTotalRequests) {
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
  console.log(`📊 Total Requests: ${actualTotalRequests}`);
  console.log(`✅ Successful: ${successful} (${(successful/actualTotalRequests*100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failed} (${(failed/actualTotalRequests*100).toFixed(1)}%)`);
  console.log(`   └─ 504 Timeouts: ${timeouts504}`);
  console.log(`   └─ Other Errors: ${otherErrors}`);
  console.log(`⏱️  Total Test Time: ${Math.round(totalDuration/1000)}s`);
  console.log(`🔥 Fastest Response: ${minDuration}ms`);
  console.log(`🐌 Slowest Response: ${maxDuration}ms`);
  console.log(`📈 Average Response: ${Math.round(avgDuration)}ms`);
  
  console.log(`\n💾 FILES SAVED:`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📁 Results directory: ${resultsDir}`);
  console.log(`📄 Individual files: test_001.json to test_${actualTotalRequests.toString().padStart(3, '0')}.json`);
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
  const successRate = (successful / actualTotalRequests) * 100;
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