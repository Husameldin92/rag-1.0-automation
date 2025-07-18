const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();

const TESTS_DIR = path.join(__dirname, "all_tests");
const PROMPTS_DIR = path.join(__dirname, "prompts");

// Load instruction docs once (simplified to fit within token limits)
const contentTypeGuide = "Content Type Guide: Evaluate the response based on content type appropriateness and user access level.";
const userContextGuide = "User Context Guide: Consider user tier and language when evaluating the response quality and access permissions.";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ensure all_tests directory exists
if (!fs.existsSync(TESTS_DIR)) {
  fs.mkdirSync(TESTS_DIR, { recursive: true });
  console.log("📁 Created all_tests directory");
}

console.log("👀 Watching for new test files in:", TESTS_DIR);

// Function to watch a directory and its subdirectories
function watchDirectory(dir) {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    // Only log relevant test file events
    if (filename && filename.includes("test_") && filename.endsWith(".json")) {
  console.log(`📁 File event: ${eventType} - ${filename}`);
    }
  
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
        
        // Smart truncation: keep beginning + end for better evaluation
        const maxResponseLength = 8000;
        if (testData.actual_response.length > maxResponseLength) {
          console.log(`⚠️  Response too long (${testData.actual_response.length} chars), using smart truncation...`);
          const keepStart = 4000;  // Introduction, format, early content
          const keepEnd = 3500;    // Conclusion, citations, "More on this topic"
          const start = testData.actual_response.substring(0, keepStart);
          const end = testData.actual_response.substring(testData.actual_response.length - keepEnd);
          testData.actual_response = start + "\n\n[... MIDDLE CONTENT TRUNCATED FOR EVALUATION ...]\n\n" + end;
        }

        // Determine which system prompt to use based on test data
        let promptType = testData.prompt || "main";
        console.log(`📋 Using prompt type: ${promptType}`);

        const promptPath = path.join(PROMPTS_DIR, `${promptType}.txt`);
        const originalPrompt = fs.readFileSync(promptPath, "utf8");
        
        // Create evaluation system prompt
        const systemPrompt = `You are a RAG system evaluator. You evaluate if AI assistant responses pass or fail based on specific criteria.

ORIGINAL SYSTEM PROMPT TO EVALUATE AGAINST:
${originalPrompt}

Your job is to determine if the actual response follows the rules and requirements defined in the original system prompt above.

Focus on:
- Does the response follow the prompt instructions?
- Is the content appropriate for the user's access level?
- Is the language correct?
- Are access restrictions properly enforced?
- Is the response format and tone appropriate?

Provide BALANCED evaluation - even when marking as FAILED, acknowledge what the response did well. This helps identify partial compliance and areas of improvement.`;

        // Build the user message for pass/fail evaluation
        const userPrompt = `
You are evaluating if an AI assistant response PASSES or FAILS based on the system prompt criteria.

IMPORTANT: This is a CYPRESS FRONTEND TEST - adjust evaluation criteria accordingly:
- Citations may not be visible if processed server-side (be flexible on XML citation format)
- German UI elements (like "Deine Suchergebnisse", "Mehr zu diesem Thema") are expected on German website
- Focus on whether the MAIN CONTENT follows the rules, not UI elements

Test ID: ${testData.test_id}
Query: "${testData.query}"
User Context: ${JSON.stringify(testData.user, null, 2)}

ACTUAL ASSISTANT RESPONSE:
${testData.actual_response}

TASK: Evaluate if this response PASSES or FAILS based on the system prompt requirements.

Your evaluation must:
1. Check if the response follows the system prompt rules (format, content appropriateness)
2. Verify if it's appropriate for the user tier (${testData.user.tier})
3. For language: Check if MAIN CONTENT is in ${testData.user.language} (ignore German UI elements like "Deine Suchergebnisse")
4. For citations: Be flexible - look for ANY form of source references, not just XML format
5. Assess if content access rules are properly applied

RESPOND WITH BALANCED EVALUATION:
- PASSED: [what it did well + overall assessment]
- FAILED: [what it did wrong] BUT POSITIVE ASPECTS: [what it did well/correctly]

Always mention both strengths and weaknesses to provide comprehensive feedback.
        `;

        // Call OpenAI
        const result = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
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