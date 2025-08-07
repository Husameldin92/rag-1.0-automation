const test_query_en = 'When is next DevOps Training Kubernetes happening?'
const test_query_de = 'Wann findet die nächste DevOps Training Kubernetes statt?'
const test_query_nl = 'Wanneer vindt de volgende DevOps Training Kubernetes plaats?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Series 7 Evaluation Criteria - DevOps Training Kubernetes
const evaluation_criteria = {
  test_focus: "Series Event Information Query - DevOps Training Kubernetes",
  required_checks: [
    "LANGUAGE CHECK: Compare the language of discovery_data.query_sent with the language of actual_response. For this test: if query_sent is 'When is next DevOps Training Kubernetes happening?' (English), then actual_response should be in English. If query_sent is 'Wann findet die nächste DevOps Training Kubernetes statt?' (German), then actual_response should be in German. If query_sent is 'Wanneer vindt de volgende DevOps Training Kubernetes plaats?' (Dutch), then actual_response should be in Dutch. Ignore the language of discovery chunk titles - only compare query_sent vs actual_response languages.",
    "FIRST CHUNK CHECK: Examine discovery_data.results[0] - since this is a DevOps Training query for Kubernetes, the first chunk should ideally be from any DevOps Training Kubernetes session or module. If no future Kubernetes training is available, the first chunk should be from ANY future training or camp (any technology, any training type). Check both title and parentName for future dates (2025 or later) and Kubernetes-related content.",
    "CHUNK ANALYSIS: Look at discovery_data.results and verify that many chunks are from DevOps Training sessions, particularly Kubernetes-related content. There should be chunks related to Kubernetes training specifically, and also other DevOps training topics (Docker, monitoring, CI/CD, etc.). The discovery should show a strong focus on DevOps training content with Kubernetes emphasis, demonstrating good relevance to the Kubernetes training query.",
    "RESPONSE ACCURACY CHECK: The actual_response should provide accurate information about DevOps Training Kubernetes. CRITICAL: Check the current date context provided above. Compare any mentioned training dates with today's date to determine if the training is actually in the future or past. If the response states a training is 'upcoming' when it's actually past according to the current date, this check should FAIL. The response should acknowledge the correct temporal status of the training.",
  ]
}

function askQuestionAndSave(query, language, file_suffix) {
  let discoveryData = null
  
  // Intercept the discovery query
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query && (req.body.query.includes('discover(question:') || req.body.query.includes('discovery(question:') || req.body.query.includes('discoveryTest'))) {
      req.continue((res) => {
        const queryVar = req.body.variables.question || req.body.variables.discoveryTest || query
        const rawResults = res.body.data?.discover?.results || res.body.data?.discovery?.results || res.body.data?.discoveryTest?.results || []
        
        const cleanResults = rawResults.map(item => ({
          _id: item._id,
          title: item.title,
          parentGenre: item.parentGenre,
          parentName: item.parentName
        }))
        
        discoveryData = {
          query_sent: queryVar,
          results: cleanResults
        }
      })
    }
  }).as('discoveryQuery')

  // Ask the question
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(query + '{enter}')

  // Wait for response
  cy.wait('@discoveryQuery', { timeout: 50000 })
  cy.wait(50000)

  // Copy the answer and save everything to JSON
  cy.get('body').then(($body) => {
    let actualResponse = ''
    
    const $element = $body.find('.markdown-binding').first().length > 0
      ? $body.find('.markdown-binding').first()
      : $body.find('.markdown-wrapper').first().length > 0
      ? $body.find('.markdown-wrapper').first()
      : $body.find('[class*="markdown"]').first()
    
    if ($element.length > 0) {
      actualResponse = $element.text().trim()
    }
    
    // Save to JSON
    cy.writeFile(`rag-ai-evaluator/all_tests/series_test_results/test_series_7/test_series_7_${file_suffix}.json`, {
      test_id: `test_series_007_${file_suffix}`,
      series_name: 'DevOps Training Kubernetes',
      query: query,
      endpoint: 'entwickler_de_explore',
      user: {
        tier: 'elevate',
        language: language
      },
      prompt: 'main',
      actual_response: actualResponse,
      discovery_data: discoveryData,
      evaluation_criteria: evaluation_criteria
    })
    
    // Take screenshot
    cy.screenshot(`test-series-7-devops-training-kubernetes-${file_suffix}`)
  })
}

export const testSeries7 = () => {
  // 1. Login
  cy.visit('https://entwickler.de/login/')
  cy.wait(3000)
  
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  cy.get('#username').type(user_login_elevate)
  cy.get('#password').type(user_password)
  cy.get(':nth-child(5) > .woocommerce-Button').click()
  cy.wait(5000)

  // 2. Go to explore page
  cy.visit('https://entwickler.de/reader/explore')
  cy.wait(3000) // Wait for explore page to load
  
  // 3. Ask first question (English)
  askQuestionAndSave(test_query_en, 'en', 'en')
  
  // 4. Ask second question (German) 
  askQuestionAndSave(test_query_de, 'de', 'de')
  
  // 5. Ask third question (Dutch)
  askQuestionAndSave(test_query_nl, 'nl', 'nl')
}