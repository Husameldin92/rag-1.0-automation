const test_query_en = 'When is next APICon London happening?'
const test_query_de = 'Wann findet die nächste APICon London statt?'
const test_query_nl = 'Wanneer vindt de volgende APICon London plaats?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Series 1 Evaluation Criteria - APICon London
const evaluation_criteria = {
  test_focus: "Series Event Information Query - APICon London",
  required_checks: [
    "LANGUAGE CHECK: Compare the language of discovery_data.query_sent with the language of actual_response. They should match (German question = German response, English question = English response, etc.). Use the actual JSON fields, not external assumptions.",
    "FIRST CHUNK CHECK: Examine discovery_data.results[0].title - it should contain 'APICon' or 'APIcon' or 'API Conference' AND 'Opening Keynote' AND a future year (2025). The title 'Welcome and Opening Keynote of APIcon New York 2025' is a perfect example that should PASS this check.",
    "CHUNK ANALYSIS: Count chunks in discovery_data.results that contain 'APICon' or 'APIcon' or 'API Conference' or 'API Con' in EITHER the title OR parentName field. At least 20% of the total chunks should be APICon-related events.",
    "RESPONSE ACCURACY CHECK: The actual_response should NOT start with misleading statements like 'The next APICon London is scheduled for [past date]'. When no future event is scheduled, the response should immediately clarify this fact, not lead with outdated information. Starting with past dates as if they are upcoming events is an automatic FAIL, regardless of later clarifications.",
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
    cy.writeFile(`rag-ai-evaluator/all_tests/series_test_results/test_series_1_${file_suffix}.json`, {
      test_id: `test_series_001_${file_suffix}`,
      series_name: 'APICon London',
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
    cy.screenshot(`test-series-1-api-con-london-${file_suffix}`)
  })
}

export const testSeries1 = () => {
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