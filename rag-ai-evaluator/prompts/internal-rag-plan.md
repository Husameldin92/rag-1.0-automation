✅ RAG AI Evaluator Setup
- This guide explains how to set up and run your automated AI-based QA evaluator using the OpenAI API.

📁 Required Files
- Make sure the following files and folders are present in your project:

* prompt.txt
→ Contains the system prompt used by the evaluator to judge each response.

* evaluate_rag.js
→ Main Node.js script that loops through your test cases and sends them to the OpenAI API.

* test_cases/ (folder)
→ Includes individual test files like test_001.js, test_002.js, etc.

* .env
→ Stores your OpenAI API key as OPENAI_API_KEY=....

📦 Install Dependencies
Run this in your terminal:

npm install openai dotenv

🔐 Environment Configuration
Create a .env file in the root of your project and add your OpenAI API key:

OPENAI_API_KEY=sk-XXXXXXXXXXXXXXXXXXXXXXXX
Make sure your evaluate_rag.js includes:


🧪 Running the Evaluator

node evaluate_rag.js
This will:

Load your prompt.txt

Loop through all test case files

Send them to GPT-3.5 for evaluation

Log verdicts for each test (✅ PASS / ❌ FAIL with reason)

🛠️ Optional (Advanced)
- Export results to CSV/Markdown

- Auto-generate test case files from Cypress

- Integrate into CI pipelines

