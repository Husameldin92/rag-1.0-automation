const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function evaluateTest(testPath) {
  try {
    console.log(`🔄 Processing test file: ${testPath}`);
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

Sample chunks (showing first 5 and last 5 for evaluation):
${testData.discovery_data.results.slice(0, 5).map((chunk, i) => 
`Chunk ${i+1}: ID=${chunk._id}, Title="${chunk.title}", ParentGenre=${chunk.parentGenre}`
).join('\n')}
...
${testData.discovery_data.results.slice(-5).map((chunk, i) => 
`Chunk ${testData.discovery_data.results.length-4+i}: ID=${chunk._id}, Title="${chunk.title}", ParentGenre=${chunk.parentGenre}`
).join('\n')}

COMPLETE PARENTGENRE BREAKDOWN:
${testData.discovery_data.results.reduce((counts, chunk) => {
  counts[chunk.parentGenre || 'null'] = (counts[chunk.parentGenre || 'null'] || 0) + 1;
  return counts;
}, {})}
` : ''}

EVALUATION INSTRUCTIONS:
- Analyze each criterion thoroughly and provide detailed reasoning
- Use semantic understanding when evaluating chunk relevance and content accuracy
- Use professional language and clear explanations
- Include specific evidence from the data
- Format your response with proper sections and symbols
- Be accurate but also comprehensive in your assessment

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

    // Call OpenAI
    const result = await openai.chat.completions.create({
      model: "gpt-4o",
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
    
    console.log(`\n${status} - ${path.basename(testPath)}`);
    console.log(`📝 ${verdict.substring(0, 150)}${verdict.length > 150 ? '...' : ''}\n`);

    const verdictFilename = testPath.replace(".json", "_verdict.txt");
    fs.writeFileSync(verdictFilename, verdict, "utf8");
    console.log(`💾 New verdict saved to: ${verdictFilename}\n`);
    
    return verdict;
  } catch (err) {
    console.error("❌ Error processing file:", testPath, "\n", err.message);
    throw err;
  }
}

// Get the file path from command line arguments
const testPath = process.argv[2];
if (!testPath) {
  console.error("Usage: node evaluate_single.js <path_to_test_file>");
  process.exit(1);
}

if (!fs.existsSync(testPath)) {
  console.error(`File not found: ${testPath}`);
  process.exit(1);
}

evaluateTest(testPath).catch(console.error); 