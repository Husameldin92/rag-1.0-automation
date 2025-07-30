const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Test questions for stress testing
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
  'How do I use Signals in Angular?',
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
  'How do I implement GraphQL caching?'
];

// Function to make API request
function makeAPIRequest(query, testNumber) {
  return new Promise((resolve, reject) => {
    // GraphQL query - simplified for stress testing
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
        'User-Agent': `StressTest-${testNumber}`,
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
        
        // Parse JSON response if possible
        let parsedResponse = null;
        try {
          parsedResponse = JSON.parse(responseData);
        } catch (e) {
          // Keep raw response if JSON parsing fails
        }
        
        resolve({
          testNumber,
          statusCode: res.statusCode,
          duration,
          success: res.statusCode === 200,
          responseSize: responseData.length,
          query: query.substring(0, 50) + '...',
          fullQuery: query,
          response: parsedResponse || responseData.substring(0, 500) + '...' // First 500 chars if not JSON
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
        query: query.substring(0, 50) + '...'
      });
    });

    req.write(data);
    req.end();
  });
}

// Main stress test function
async function runStressTest(numberOfTests = 100) {
  console.log(`🚀 Starting backend stress test with ${numberOfTests} concurrent requests...`);
  console.log(`📊 Each request will hit your backend API directly`);
  console.log(`⚡ No browsers, just pure API load testing\n`);

  // Create results directory with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').split('.')[0];
  const resultsDir = path.join(__dirname, 'results', `test_${timestamp}_${numberOfTests}tests`);
  
  if (!fs.existsSync(path.join(__dirname, 'results'))) {
    fs.mkdirSync(path.join(__dirname, 'results'));
  }
  fs.mkdirSync(resultsDir);
  
  console.log(`📁 Results will be saved to: ${resultsDir}\n`);

  const promises = [];
  
  // Create test requests
  for (let i = 1; i <= numberOfTests; i++) {
    const question = questions[(i - 1) % questions.length]; // Cycle through questions
    promises.push(makeAPIRequest(question, i));
  }

  const startTime = Date.now();
  
  // Execute all requests simultaneously
  try {
    const results = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;
    
    // Save individual result files
    console.log(`💾 Saving individual result files...`);
    results.forEach(result => {
      const filename = `test_${result.testNumber.toString().padStart(3, '0')}.json`;
      const filepath = path.join(resultsDir, filename);
      
      const resultData = {
        testNumber: result.testNumber,
        query: result.fullQuery,
        statusCode: result.statusCode,
        success: result.success,
        duration: result.duration,
        responseSize: result.responseSize,
        timestamp: new Date().toISOString(),
        response: result.response,
        error: result.error || null
      };
      
      fs.writeFileSync(filepath, JSON.stringify(resultData, null, 2));
    });
    

    
    // Analyze results
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    const maxDuration = Math.max(...results.map(r => r.duration));
    const minDuration = Math.min(...results.map(r => r.duration));
    
    // Print results
    console.log(`\n🎯 STRESS TEST RESULTS:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Total Tests: ${numberOfTests}`);
    console.log(`✅ Successful: ${successful} (${(successful/numberOfTests*100).toFixed(1)}%)`);
    console.log(`❌ Failed: ${failed} (${(failed/numberOfTests*100).toFixed(1)}%)`);
    console.log(`⏱️  Total Time: ${totalDuration}ms`);
    console.log(`🔥 Fastest: ${minDuration}ms`);
    console.log(`🐌 Slowest: ${maxDuration}ms`);
    console.log(`💪 Requests/Second: ${(numberOfTests / (totalDuration / 1000)).toFixed(1)}`);
    
    console.log(`\n💾 FILES SAVED:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📁 Results directory: ${resultsDir}`);
    console.log(`📄 Individual files: test_001.json to test_${numberOfTests.toString().padStart(3, '0')}.json`);

    console.log(`🔍 Each file contains: query, response, timing, status`);
    
    // Show first few results
    console.log(`\n📋 Sample Results:`);
    results.slice(0, 100).forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} Test ${result.testNumber}: ${result.duration}ms - "${result.query}"`);
    });
    
    if (failed > 0) {
      console.log(`\n⚠️  Failed tests might indicate:`);
      console.log(`   • Backend overload`);
      console.log(`   • Network timeouts`);
    }
    
  } catch (error) {
    console.error('❌ Stress test failed:', error);
  }
}

// Run the stress test
const numberOfTests = process.argv[2] ? parseInt(process.argv[2]) : 100;
runStressTest(numberOfTests);