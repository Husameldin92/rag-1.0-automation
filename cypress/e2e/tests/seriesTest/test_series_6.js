const test_query_en = 'When is next DevOps Training Docker happening?'
const test_query_de = 'Wann findet die nächste DevOps Training Docker statt?'
const test_query_nl = 'Wanneer vindt de volgende DevOps Training Docker plaats?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Series 6 Evaluation Criteria - DevOps Training Docker
const evaluation_criteria = {
  test_focus: "Series Event Information Query - DevOps Training Docker",
  required_checks: [
    "LANGUAGE CHECK: Compare the language of discovery_data.query_sent with the language of actual_response. For this test: if query_sent is 'When is next DevOps Training Docker happening?' (English), then actual_response should be in English. If query_sent is 'Wann findet die nächste DevOps Training Docker statt?' (German), then actual_response should be in German. If query_sent is 'Wanneer vindt de volgende DevOps Training Docker plaats?' (Dutch), then actual_response should be in Dutch. Ignore the language of discovery chunk titles - only compare query_sent vs actual_response languages.",
    "FIRST CHUNK CHECK: Examine discovery_data.results[0] - since the last DevOps Training Docker was in 2024 and is now in the past, and no future DevOps Training Docker is scheduled, the first chunk should be from ANY future training or camp (any technology, any training type). Check both title and parentName for future dates (2025 or later). A chunk like 'Tag 3: Deployment und DevOps: Automatisierung und Team-Aufbau' with parentName 'Modul FLEX Dezember 2025 | Online' should PASS this check because it's a future DevOps-related training from December 2025.",
    "CHUNK ANALYSIS: Look at discovery_data.results and verify that many chunks are from DevOps Training sessions. Since DevOps Training Docker is in the past, chunks from past Docker trainings are acceptable. Other DevOps training content (Kubernetes, monitoring, CI/CD, etc.) is also acceptable, but Docker training content should be prioritized when available.",
    "RESPONSE ACCURACY CHECK: The actual_response should provide accurate information about DevOps Training Docker. CRITICAL: Check the current date context provided above. Since the last DevOps Training Docker was in 2024 and we're now past that, if the response states this training is 'upcoming' or 'in the future' when it's actually past, this check should FAIL. The response should acknowledge the correct temporal status and that the most recent training was in 2024.",
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
    cy.writeFile(`rag-ai-evaluator/all_tests/series_test_results/test_series_6/test_series_6_${file_suffix}.json`, {
      test_id: `test_series_006_${file_suffix}`,
      series_name: 'DevOps Training Docker',
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
    cy.screenshot(`test-series-6-devops-training-docker-${file_suffix}`)
  })
}

export const testSeries6 = () => {
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