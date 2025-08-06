const test_query_en = 'When is next BASTA! Spring happening?'
const test_query_de = 'Wann findet die nächste BASTA! Spring statt?'
const test_query_nl = 'Wanneer vindt de volgende BASTA! Spring plaats?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Series 4 Evaluation Criteria - BASTA! Spring
const evaluation_criteria = {
  test_focus: "Series Event Information Query - BASTA! Spring",
  required_checks: [
    "LANGUAGE CHECK: Compare the language of discovery_data.query_sent with the language of actual_response. For this test: if query_sent is 'When is next BASTA! Spring happening?' (English), then actual_response should be in English. If query_sent is 'Wann findet die nächste BASTA! Spring statt?' (German), then actual_response should be in German. If query_sent is 'Wanneer vindt de volgende BASTA! Spring plaats?' (Dutch), then actual_response should be in Dutch. Ignore the language of discovery chunk titles - only compare query_sent vs actual_response languages.",
    "FIRST CHUNK CHECK: Examine discovery_data.results[0].title - it should be exactly 'Begrüßung zur BASTA! Spring 2026 in Frankfurt'. This MUST be the first result (position 0). If this exact title is not in position 0, search through all results and report which position it appears in. If it's not in position 0, this check should FAIL but mention where the correct title was found.",
    "CHUNK ANALYSIS: Look at discovery_data.results and verify that there are BASTA-related events. Since there may be no other specific sessions for BASTA! Spring 2026, it's acceptable to see chunks from other BASTA events (Herbst, previous Spring events, etc.). The discovery should show a reasonable focus on BASTA events in general, demonstrating relevance to the BASTA query.",
    "RESPONSE ACCURACY CHECK: The actual_response should provide accurate information about BASTA! Spring. Since BASTA! Spring 2026 is scheduled for the future, it's acceptable and expected to mention the upcoming event dates. The response should distinguish between past and future events clearly and provide correct scheduling information.",
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
    cy.writeFile(`rag-ai-evaluator/all_tests/series_test_results/test_series_4/test_series_4_${file_suffix}.json`, {
      test_id: `test_series_004_${file_suffix}`,
      series_name: 'BASTA! Spring',
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
    cy.screenshot(`test-series-4-basta-spring-${file_suffix}`)
  })
}

export const testSeries4 = () => {
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