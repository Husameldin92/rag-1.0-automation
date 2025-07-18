# RAG 1.0 Automation Testing Suite

A comprehensive end-to-end testing framework for RAG (Retrieval-Augmented Generation) systems using Cypress and AI-powered evaluation.

## 🚀 How It Works

This project provides **automated testing and AI evaluation** for RAG systems:

### **Workflow Overview:**

1. **Start the AI Evaluator** (watches for test results):
   ```bash
   cd rag-ai-evaluator
   node watcher.js
   ```

2. **Run Cypress Tests** (in another terminal):
   ```bash
   npx cypress run --spec "cypress/e2e/rag_main.cy.js"
   # OR
   npx cypress open
   ```

3. **Automatic Processing**:
   - 🧪 Cypress tests query your RAG system in **English** and **German**
   - 📝 Each test creates **JSON files** with query results: `test_1_en.json`, `test_1_de.json`, etc.
   - 👀 **Watcher detects** new JSON files automatically
   - 🤖 **AI evaluator** processes each file using OpenAI GPT-4
   - ✅ **Verdict files** appear: `test_1_en_verdict.txt`, `test_1_de_verdict.txt`, etc.

4. **Get Results**: Check the `all_tests/` folder for AI evaluation verdicts

---

## 📋 Quick Setup

### **1. Clone Repository**
```bash
git clone https://github.com/Husameldin92/rag-1.0-automation.git
cd rag-1.0-automation
```

### **2. Install Dependencies**
```bash
npm install
```
*This installs Cypress, OpenAI client, and all required dependencies*

### **3. Configure OpenAI API Key**
```bash
cd rag-ai-evaluator
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
cd ..
```
*Replace `your_openai_api_key_here` with your actual OpenAI API key*

### **4. Run Tests**

**Option A: Interactive Mode (GUI)**
```bash
npx cypress open
```
- Select `rag_main.cy.js` to run all 23 tests
- Or choose individual test files in `tests/mainPrompt/`

**Option B: Headless Mode (Command Line)**
```bash
# Run all tests
npx cypress run --spec "cypress/e2e/rag_main.cy.js"

# Run specific tests
npx cypress run --spec "cypress/e2e/tests/mainPrompt/test_1.js,cypress/e2e/tests/mainPrompt/test_2.js"
```

---

## 🧪 Test Suite Coverage

### **23 Comprehensive Tests:**

- **Tests 1-4:** Basic Rules & Metadata Interpretation
- **Tests 5-7:** Ambiguous/Vague/Malformed Queries  
- **Tests 8-10:** Version-Specific Behavior
- **Tests 11-12:** Content Matching & Metadata
- **Tests 13-14:** Content Grouping & Framework Differentiation
- **Tests 15-16:** Citation Format & Integrity
- **Tests 17-18:** Access Control & Restrictions
- **Tests 19-20:** External Source Handling
- **Tests 21-22:** User Context Matching
- **Test 23:** Fallback Behavior

### **Each Test Validates:**
- ✅ **Dual Language Support** (English & German)
- ✅ **Content Appropriateness** for user tiers
- ✅ **Citation Quality** and format
- ✅ **Access Control** logic
- ✅ **Response Relevance** and tone

---

## 🤖 AI Evaluation System

### **Automated Quality Assessment:**

- **Smart Evaluation:** Uses GPT-4 to assess response quality
- **Balanced Feedback:** Provides both strengths and areas for improvement
- **Flexible Criteria:** Adapts to different test scenarios
- **Comprehensive Coverage:** Evaluates format, content, citations, and access logic

### **Evaluation Criteria:**
- Content relevance and accuracy
- Appropriate language usage
- Citation format and integrity
- User tier access compliance
- Professional tone and clarity

---

## 📁 Project Structure

```
rag-1.0-automation/
├── cypress/
│   ├── e2e/
│   │   ├── rag_main.cy.js          # Main test suite
│   │   └── tests/mainPrompt/        # Individual test files
│   ├── support/                     # Cypress configuration
│   └── fixtures/                    # Test data
├── rag-ai-evaluator/
│   ├── watcher.js                   # AI evaluation engine
│   ├── prompts/                     # AI evaluation prompts
│   ├── all_tests/                   # Generated test results
│   └── .env                         # OpenAI API key (you create this)
├── package.json                     # Dependencies
└── cypress.config.js               # Cypress configuration
```

---

## 🔧 Advanced Usage

### **Running Specific Tests:**

Add `.only()` to run specific tests in `rag_main.cy.js`:
```javascript
it.only('Test 1: Should return Angular Signals features...', () => {
    test1()
})
```

### **Custom Evaluation Prompts:**

Modify prompts in `rag-ai-evaluator/prompts/` to customize AI evaluation criteria.

### **Staging Environment:**

Tests are pre-configured for staging environment with authentication. Credentials are included for immediate testing.

---

## 📊 Expected Results

### **Successful Run:**
- ✅ 21+ tests passing
- 📝 88 screenshots generated
- 🤖 AI verdicts for each test scenario
- ⏱️ ~112 minutes execution time (full suite)

### **Output Files:**
- `test_X_en.json` - English test results
- `test_X_de.json` - German test results  
- `test_X_en_verdict.txt` - AI evaluation (English)
- `test_X_de_verdict.txt` - AI evaluation (German)

---

## 💡 Tips

- **Parallel Execution:** Run watcher in one terminal, tests in another
- **Quick Testing:** Use `.only()` for individual test debugging
- **Results Monitoring:** Watch `all_tests/` folder for real-time results
- **Flexible Running:** Choose GUI mode for development, headless for automation

---

## 🛠️ Requirements

- **Node.js** 18+ 
- **OpenAI API Key** (for AI evaluation)
- **Internet Connection** (for staging environment access)

---

**Ready to test your RAG system? Start the watcher and run the tests!** 🚀 