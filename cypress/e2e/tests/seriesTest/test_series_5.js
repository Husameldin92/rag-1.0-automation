const test_query_en = 'When is next Delphi Code Camp Duesseldorf happening?'
const test_query_de = 'Wann findet die nächste Delphi Code Camp Düsseldorf statt?'
const test_query_nl = 'Wanneer vindt de volgende Delphi Code Camp Düsseldorf plaats?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Series 5 Evaluation Criteria - Delphi Code Camp Duesseldorf
const evaluation_criteria = {
  test_focus: "Series Event Information Query - Delphi Code Camp Duesseldorf",
  required_checks: [
    "LANGUAGE CHECK: Compare the language of discovery_data.query_sent with the language of actual_response. For this test: if query_sent is 'When is next Delphi Code Camp Duesseldorf happening?' (English), then actual_response should be in English. If query_sent is 'Wann findet die nächste Delphi Code Camp Düsseldorf statt?' (German), then actual_response should be in German. If query_sent is 'Wanneer vindt de volgende Delphi Code Camp Düsseldorf plaats?' (Dutch), then actual_response should be in Dutch. Ignore the language of discovery chunk titles - only compare query_sent vs actual_response languages.",
    "FIRST CHUNK CHECK: Examine discovery_data.results[0].title - since the Delphi Code Camp Duesseldorf is in the past (June 30 - July 2, 2025) and no future Delphi Code Camp is scheduled, the first chunk should be from ANY future camp (any technology, any camp type) since we still don't have a future Delphi camp available. The system should prioritize future camps over past ones.",
    "CHUNK ANALYSIS: Look at discovery_data.results and verify that many chunks are from Delphi Code Camps. If there are future camps available, chunks should primarily be from those. If only past camps exist, chunks from past camps are acceptable. General Delphi/EKON content is also acceptable but Code Camp content should be prioritized.",
    "RESPONSE ACCURACY CHECK: The actual_response should provide accurate information about Delphi Code Camp Duesseldorf. CRITICAL: Check the current date context provided above. Since the Delphi Code Camp was scheduled for 30.06.2025 - 02.07.2025 (June 30 - July 2, 2025), compare this with today's date. If the current date is after July 2025, this event is already PAST. If the response states this event is 'in the future' or 'upcoming' when it's actually past, this check should FAIL. The response should acknowledge the correct temporal status of the event.",
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
    cy.writeFile(`rag-ai-evaluator/all_tests/series_test_results/test_series_5/test_series_5_${file_suffix}.json`, {
      test_id: `test_series_005_${file_suffix}`,
      series_name: 'Delphi Code Camp Duesseldorf',
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
    cy.screenshot(`test-series-5-delphi-code-camp-duesseldorf-${file_suffix}`)
  })
}

export const testSeries5 = () => {
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