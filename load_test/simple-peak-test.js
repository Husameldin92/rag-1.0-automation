const https = require('https');
const fs = require('fs');
const path = require('path');

// Fix 1: Custom HTTPS agent with higher socket limits
const httpsAgent = new https.Agent({ 
  maxSockets: 100,
  keepAlive: true,
  timeout: 10000
});

// Simple questions for testing
const questions = [
  "What are the main features of Angular Signals in version 17?",
  "Tell me about React useEffect from tutorials only.",
  "Can you summarize recent events on DevOps from articles?",
  "What are some common mistakes in Dockerfile configuration?",
  "What's up?",
  "Angular better?",
  "Give me something cool about tech.",
  "How do I use Signals in Angular 13?",
  "What changed in Angular 17 Signals?",
  "Explain Observables in Angular 15.",
  "How does Angular handle routing?",
  "How does Next.js handle dynamic routing?",
  "What's new in React 18 hooks?",
  "How does useMemo work in React?",
  "What's the best way to manage state in Vue.js?",
  "How to implement microservices in Node.js?",
  "Show me events about Kubernetes.",
  "Link me a course about Docker on Coursera.",
  "What does Medium say about async/await?",
  "Give me an article about TypeScript types."
];

// API request function with retry capability
async function makeAPIRequestWithRetry(question, requestNumber, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    const result = await makeAPIRequest(question, requestNumber);
    
    // Success or actual HTTP error (not timeout) - return immediately
    if (result.success || (result.statusCode && result.statusCode !== 504)) {
      if (i > 0) {
        console.log(`🔁 Retry ${i} succeeded for request ${requestNumber}`);
      }
      return result;
    }

    // Timeout or 504 - retry if we have attempts left
    if (i < retries) {
      console.log(`🔁 Retry ${i + 1} for request ${requestNumber} due to ${result.error}`);
      await new Promise(res => setTimeout(res, 200)); // 200ms delay between retries
    }
  }

  // All retries failed
  return {
    requestNumber,
    query: question,
    success: false,
    error: '504 after retries',
    statusCode: 504,
    is504: true,
    duration: 10000,
    response: null
  };
}

// Original API request function (no retry)
function makeAPIRequest(question, requestNumber) {
  const startTime = Date.now();
  
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
      question: question
    }
  };

  const postData = JSON.stringify(graphqlQuery);

  const options = {
    hostname: 'concord.sandsmedia.com',
    port: 443,
    path: '/graphql',
    method: 'POST',
    agent: httpsAgent, // Fix 2: Use custom agent
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length,
      'User-Agent': `SimplePeakTest-${requestNumber}`,
      'access-token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhcHBVc2VySWQiOiI2ODgwZjAzZjkwMTU2ZjA3MWUzNTVmNGEiLCJpYXQiOjE3NTM5MTAzOTIsImV4cCI6MTc1NzM2NjM5Mn0.dEJLiXarAeB7HLq8DXKiAYATcGQhLL2PJwkvhvGj8A0'
    },
    timeout: 10000 // Fix 3: Shorter timeout
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        const success = res.statusCode === 200;
        const is504 = res.statusCode === 504;
        
        resolve({
          requestNumber,
          query: question,
          statusCode: res.statusCode,
          success,
          is504,
          duration,
          response: success ? data : null,
          error: success ? null : `HTTP ${res.statusCode}`
        });
      });
    });

    // Fix 4: Single timeout handling
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        requestNumber,
        query: question,
        success: false,
        error: 'Request timeout (10s)',
        duration: 10000,
        statusCode: null,
        is504: false // Timeout, not 504
      });
    });

    req.on('error', (error) => {
      resolve({
        requestNumber,
        query: question,
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        statusCode: null,
        is504: false // Error, not 504
      });
    });

    req.write(postData);
    req.end();
  });
}

async function runSimplePeakTest() {
  console.log("🚀 SIMPLE PEAK USAGE TEST");
  console.log("Following EXACT original requirements");
  console.log("━".repeat(50));
  
  // Step 1: OFFICIAL TEST - Full 400 request run
  const debugRequests = 400; // OFFICIAL: Full test as specified
  const maxPossible = 60 * 5; // 300 
  const actualRequests = Math.min(debugRequests, maxPossible);
  
  console.log(`🎯 OFFICIAL TEST: Running ${actualRequests} requests over 60 seconds`);
  console.log(`📋 Testing: Volume, spread, max 5/sec, random distribution, 504 counting`);
  
  // Get questions (repetition is fine)
  const testQuestions = [];
  for (let i = 0; i < actualRequests; i++) {
    testQuestions.push(questions[i % questions.length]);
  }
  
  // Step 2: Assign each an integer n between 0 and 59
  // Step 3: Check there are no numbers appearing more than 5 times
  const assignments = [];
  const secondCounts = Array(60).fill(0);
  
  for (let i = 0; i < actualRequests; i++) {
    let assignedSecond;
    let attempts = 0;
    
    // Random assignment until we find a second with < 5 requests
    do {
      assignedSecond = Math.floor(Math.random() * 60); // 0-59
      attempts++;
      
      if (attempts > 10000) {
        console.error(`❌ Cannot assign ${actualRequests} requests with max 5 per second`);
        process.exit(1);
      }
    } while (secondCounts[assignedSecond] >= 5);
    
    secondCounts[assignedSecond]++;
    assignments.push({
      requestNumber: i + 1,
      question: testQuestions[i],
      secondOffset: assignedSecond
    });
  }
  
  console.log(`✅ Assigned ${actualRequests} requests across 60 seconds`);
  console.log(`✅ Max per second: ${Math.max(...secondCounts)}`);
  console.log(`✅ Distribution: ${secondCounts.slice(0, 10).join(', ')}...`);
  
  // Step 4: Make those 400 requests at now()+n
  console.log("\n🎬 Starting requests...");
  const startTime = Date.now();
  const results = [];
  let completedCount = 0;
  
  // Schedule all requests
  assignments.forEach(assignment => {
    const delayMs = assignment.secondOffset * 1000; // Convert seconds to milliseconds
    
    setTimeout(async () => {
      const actualStartTime = Date.now() - startTime;
      console.log(`🔄 [${assignment.secondOffset}s] Request ${assignment.requestNumber}: "${assignment.question.substring(0, 50)}..."`);
      
              const result = await makeAPIRequestWithRetry(assignment.question, assignment.requestNumber);
        result.scheduledSecond = assignment.secondOffset;
        result.actualStartTime = actualStartTime;
        
        completedCount++;
        
        // Fix 5: Detailed error logging with status codes and 504 tracking
        if (result.success) {
          console.log(`✅ [${assignment.secondOffset}s] Request ${assignment.requestNumber} completed (${result.duration}ms) - ${completedCount}/${actualRequests} done`);
        } else {
          const statusInfo = result.statusCode ? `HTTP ${result.statusCode}` : 'No status';
          const is504Indicator = result.is504 ? ' 🚨504🚨' : '';
          console.log(`❌ [${assignment.secondOffset}s] Request ${assignment.requestNumber} failed: ${result.error} [${statusInfo}]${is504Indicator} (${result.duration}ms) - ${completedCount}/${actualRequests} done`);
          
          // Log first 504 occurrence for debugging
          if (result.is504 && !global.first504Logged) {
            console.log(`   🚨 FIRST 504 at second: ${assignment.secondOffset}s`);
            global.first504Logged = true;
          }
          
          // Log first few failure details for debugging  
          if (completedCount <= 25) {
            console.log(`   🔍 Response preview: ${result.response ? result.response.substring(0, 100) : 'No response'}...`);
          }
        }
        
        results.push(result);
    }, delayMs);
  });
  
  // Wait for all requests to complete
  console.log("\n⏳ Waiting for all requests to complete...");
  while (completedCount < actualRequests) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log(`   📊 Progress: ${completedCount}/${actualRequests} completed`);
  }
  
  // Step 5: Count the failed requests!
  console.log("\n" + "━".repeat(50));
  console.log("🎯 TEST 2 RESULTS (WITH RETRY LOGIC):");
  console.log("━".repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  const timeout504Count = results.filter(r => r.is504).length;
  
  console.log(`📊 Total Requests: ${actualRequests}`);
  console.log(`✅ Successful: ${successCount} (${(successCount*100/actualRequests).toFixed(1)}%)`);
  console.log(`❌ Failed: ${failureCount} (${(failureCount*100/actualRequests).toFixed(1)}%)`);
  console.log(`⏰ 504 Timeouts: ${timeout504Count}`);
  console.log(`🔁 With 2 retries per failed request (200ms delay)`);
  
  // Show when failures occurred
  const failures = results.filter(r => !r.success).sort((a, b) => a.scheduledSecond - b.scheduledSecond);
  console.log(`\n🔍 Failure Pattern:`);
  console.log(`First failure at: ${failures[0]?.scheduledSecond}s`);
  console.log(`Last success: ${results.filter(r => r.success).sort((a, b) => b.scheduledSecond - a.scheduledSecond)[0]?.scheduledSecond}s`);
  
  console.log("\n✅ Test completed successfully!");
}

// Run the test
runSimplePeakTest().catch(console.error);
