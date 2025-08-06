const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config({ path: path.join(__dirname, '..', '.env') });

const TESTS_DIR = path.join(__dirname, "all_tests");

// Azure OpenAI configuration
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const apiVersion = "2024-04-01-preview";
const endpoint = "https://swedishopenaibook.openai.azure.com/";
const modelName = "gpt-4o-mini";
const deployment = "gpt-4o-mini";

const openai = new OpenAI({
  apiKey: apiKey,
  baseURL: `${endpoint}openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: {
    'api-key': apiKey,
  },
});

// Ensure all_tests directory exists
if (!fs.existsSync(TESTS_DIR)) {
  fs.mkdirSync(TESTS_DIR, { recursive: true });
  console.log("📁 Created all_tests directory");
}

console.log("👀 Watching for new test files in:", TESTS_DIR);

// Function to watch a directory and its subdirectories
function watchDirectory(dir) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (
      filename &&
      filename.includes("test_") &&
      filename.endsWith(".json") &&
      (eventType === "change" || eventType === "rename")
    ) {
      const testPath = path.join(TESTS_DIR, filename);

      // Short delay to allow file to finish writing
      setTimeout(async () => {
        try {
          // Check if file exists (might be deleted in rename event)
          if (!fs.existsSync(testPath)) {
            console.log(`⚠️  File ${filename} no longer exists, skipping...`);
            return;
          }
          
          console.log(`🔄 Processing test file: ${filename}`);
          const testData = JSON.parse(fs.readFileSync(testPath, "utf8"));
          
          // Truncate response if too long to fit within token limits
          let processedResponse = testData.actual_response || "";
          if (processedResponse.length > 12000) {
            processedResponse = processedResponse.substring(0, 12000) + "\n\n[...RESPONSE TRUNCATED...]";
            console.log(`📏 Response truncated for evaluation`);
          }
          
          // Create evaluation system prompt
          const systemPrompt = `You are a RAG system evaluator. Your job is to evaluate the AI response against the specific criteria provided.

Be practical and realistic in your evaluations. Use semantic understanding when analyzing chunk relevance and content accuracy.`;

          // Build the user message for pass/fail evaluation
          const userPrompt = `
You are an AI evaluation expert. Provide a professional, detailed evaluation of the response against the specified criteria.

CRITERIA TO EVALUATE:
${testData.evaluation_criteria ? testData.evaluation_criteria.required_checks.map((check, i) => `${i+1}. ${check}`).join('\n') : 'No specific criteria provided'}

DATA TO ANALYZE:

AI RESPONSE:
${processedResponse}

${testData.discovery_data ? `
DISCOVERY DATA (Chunks selected by backend):
Total chunks: ${testData.discovery_data.results.length}

${testData.user?.communityExperience?.length ? `
USER COMMUNITY EXPERIENCE:
${testData.user.communityExperience.join(', ')}
` : ''}

Sample chunks (showing first 10 and last 5 for evaluation):
${testData.discovery_data.results.slice(0, 10).map((chunk, i) => 
`Chunk ${i+1}: ID=${chunk._id}, Title="${chunk.title}", ParentGenre=${chunk.parentGenre}, ParentName=${chunk.parentName}`
).join('\n')}
...
${testData.discovery_data.results.slice(-5).map((chunk, i) => 
`Chunk ${testData.discovery_data.results.length-4+i}: ID=${chunk._id}, Title="${chunk.title}", ParentGenre=${chunk.parentGenre}, ParentName=${chunk.parentName}`
).join('\n')}

COMPLETE PARENTGENRE BREAKDOWN:
${JSON.stringify(testData.discovery_data.results.reduce((counts, chunk) => {
  counts[chunk.parentGenre || 'null'] = (counts[chunk.parentGenre || 'null'] || 0) + 1;
  return counts;
}, {}), null, 2)}

COMPLETE PARENTNAME BREAKDOWN:
${JSON.stringify(testData.discovery_data.results.reduce((counts, chunk) => {
  counts[chunk.parentName || 'null'] = (counts[chunk.parentName || 'null'] || 0) + 1;
  return counts;
}, {}), null, 2)}
` : ''}

CURRENT DATE CONTEXT:
Today's date: ${new Date().toLocaleDateString('en-US', { 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

Use this date to evaluate if events mentioned in the response are actually in the future or past.

EVALUATION INSTRUCTIONS:
- Analyze each criterion thoroughly and provide detailed reasoning
- Use semantic understanding when evaluating chunk relevance and content accuracy
- Use professional language and clear explanations
- Include specific evidence from the data
- Format your response with proper sections and symbols
- Be accurate but also comprehensive in your assessment
- Consider the current date when evaluating if event information is accurate

RESPONSE FORMAT:
## 🔍 EVALUATION ANALYSIS

### Criterion Assessment:
[For each criterion, provide detailed analysis with ✅ or ❌ symbols]

### 📊 OVERALL RESULT:
**✅ PASSED** or **❌ FAILED** with clear reasoning

### 💡 SUMMARY:
[Brief summary of strengths and any areas for improvement]

Be thorough but ensure your evaluation is based strictly on the provided criteria.
`;

          // Call Azure OpenAI
          const result = await openai.chat.completions.create({
            model: deployment,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
          });

          const verdict = result.choices[0].message.content.trim();
          
          // Extract pass/fail status
          const isPassed = verdict.toUpperCase().includes('PASSED');
          const isFailed = verdict.toUpperCase().includes('FAILED');
          const status = isPassed ? '✅ PASSED' : isFailed ? '❌ FAILED' : '⚠️ UNCLEAR';
          
          console.log(`\n${status} - ${filename}`);
          console.log(`📝 ${verdict.substring(0, 150)}${verdict.length > 150 ? '...' : ''}\n`);

          const verdictFilename = filename.replace(".json", "_verdict.txt");
          const outPath = path.join(TESTS_DIR, verdictFilename);
          fs.writeFileSync(outPath, verdict, "utf8");
          console.log(`💾 Verdict saved to: ${verdictFilename}\n`);
        } catch (err) {
          console.error("❌ Error processing file:", filename, "\n", err.message);
        }
      }, 1000);
    }
  });
}

// Start watching the tests directory
watchDirectory(TESTS_DIR);