import {loginHandel, visitWithAuth } from '../auth_login'

const test_query_en = 'What are the main features of Angular Signals in version 17?'
const test_query_de = 'Was sind die Hauptfunktionen von Angular Signals in Version 17?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test 1 Evaluation Criteria 
const evaluation_criteria = {
  test_focus: "Version-Specific Chunk Selection and Content Analysis",
  required_checks: [
    "Discovery data must include chunks with explicit mentions of both Angular Signals AND version 17",
    "AI response must mention Angular Signals and version 17 explicitly in the main content",
    "Response content must be accurate and match information available in the selected chunks",
    "The status of Angular Signals in v17 must be accurate (e.g., stable, new features, breaking changes)"
  ]
}

function runTest(query, language, endpoint_name, file_suffix) {
  let discoveryData = null
  
  // Intercept the discovery query to capture backend chunk selection
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query && req.body.query.includes('discovery(question:')) {
      req.continue((res) => {
        discoveryData = {
          query_sent: req.body.variables.question,
          results: res.body.data.discovery.results.map(result => ({
            _id: result._id,
            title: result.title,
            parentName: result.parentName,
            designation: result.designation
          }))
        }
      })
    }
  }).as('discoveryQuery')

  // Ask the question
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(query + '{enter}')

  // Wait for response - longer wait for full response to load
  cy.wait('@discoveryQuery', { timeout: 45000 })
  cy.wait(60000) // Increased wait time for full response

  // Capture FULL AI response without truncation
  cy.get('.markdown-wrapper').invoke('text').then((actualResponse) => {
    
    // Keep the full response - no truncation
    let processedResponse = actualResponse.trim()
    
    cy.writeFile(`rag-ai-evaluator/all_tests/test_1/test_1_${file_suffix}.json`, {
      test_id: `test_001_${file_suffix}`,
      query: query,
      endpoint: endpoint_name,
      user: {
        tier: 'elevate',
        language: language
      },
      prompt: 'main',
      actual_response: processedResponse,
      discovery_data: discoveryData,
      evaluation_criteria: evaluation_criteria
    })
  })

  // Screenshot
  cy.screenshot(`test-1-angular-signals-v17-${file_suffix}`)
}

export const test1 = () => {
  loginHandel()
  
  // Handle cookie consent
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // Login
  cy.get('#username').type(user_login_elevate)
  cy.get('#password').type(user_password)
  cy.get(':nth-child(5) > .woocommerce-Button').click()

  // Handle potential second login request
  cy.get('body').then(($body) => {
    if ($body.find('#password:visible').length > 0) {
      cy.get('#password').type(user_password)
      cy.get(':nth-child(5) > .woocommerce-Button').click()
    }
  })

  cy.wait(5000)

  // Handle marketing popup
  cy.get('body').then(($body) => {
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // ========================================
  // ENDPOINT 1: reader/explore
  // ========================================
  visitWithAuth('https://staging.entwickler.de/reader/explore')
  
  // Test 1: English query
  runTest(test_query_en, 'en', 'reader_explore', 'en')
  
  // Test 2: German query  
  runTest(test_query_de, 'de', 'reader_explore', 'de')

  // ========================================
  // ENDPOINT 2: reader/explore/explore-text
  // ========================================
  visitWithAuth('https://staging.entwickler.de/reader/explore/explore-text/')
  cy.wait(3000)

  // Handle cookie consent if needed
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // Handle potential re-login
  cy.get('body').then(($body) => {
    if ($body.find('#username').length > 0) {
      cy.get('#username').type(user_login_elevate)  
      cy.get('#password').type(user_password)
      cy.get(':nth-child(5) > .woocommerce-Button').click()
      cy.wait(5000)
    }
  })

  // Handle marketing popup
  cy.get('body').then(($body) => {
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // Test 3: English query on explore-text
  runTest(test_query_en, 'en', 'reader_explore_text', 'explore_en')
  
  // Test 4: German query on explore-text
  runTest(test_query_de, 'de', 'reader_explore_text', 'explore_de')
}