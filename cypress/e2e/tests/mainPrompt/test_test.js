import {loginHandel, visitWithAuth } from '../auth_login'

const test_query_en = 'Tell me about React useEffect from tutorials only.'
const test_query_de = 'Erkläre mir React useEffect, aber nur anhand von Tutorials.'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test Evaluation Criteria 
const evaluation_criteria = {
  test_focus: "Content Type Filtering - Tutorials Only",
  required_checks: [
    "Discovery data must include only chunks with contentType 'tutorial' when user specifies 'tutorials only'",
    "Discovery data must NOT include chunks with other contentTypes (article, event, etc.)",
    "AI response must be based only on tutorial content and mention it's from tutorials",
    "No citations or references to non-tutorial content types should appear in the response"
  ]
}

function runTest(query, language, endpoint_name, file_suffix, useSearchIcon = false) {
  let discoveryData = null
  
  // Intercept the discovery query to capture backend chunk selection
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query && (req.body.query.includes('discovery(question:') || req.body.query.includes('discoveryTest'))) {
      req.continue((res) => {
        // Handle both query types: regular discovery and discoveryTest
        const queryVar = req.body.variables.question || req.body.variables.discoveryTest || query
        const rawResults = res.body.data?.discovery?.results || res.body.data?.discoveryTest?.results || []
        
        // Extract only the 3 essential fields for evaluation
        const cleanResults = rawResults.map(item => ({
          _id: item._id,
          title: item.title,
          parentGenre: item.parentGenre
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
  
  if (useSearchIcon) {
    // For explore-text endpoint: type query and click search icon
    cy.get('.rounded-0 > .col-12').type(query)
    cy.get('.search__bar_g.cursorPointer').click()
  } else {
    // For regular endpoint: type query and press enter
    cy.get('.rounded-0 > .col-12').type(query + '{enter}')
  }

  // Wait for response
  cy.wait('@discoveryQuery', { timeout: 45000 })
  cy.wait(40000) // Wait for AI response to load
  
  // Extra wait for explore-text endpoint
  if (endpoint_name.includes('explore_text')) {
    cy.wait(15000)
  }

  // Capture main answer - try both selectors
  cy.get('body').then(($body) => {
    let actualResponse = ''
    
    // Find markdown element with fallbacks
    const $element = $body.find('.markdown-binding').first().length > 0
      ? $body.find('.markdown-binding').first()
      : $body.find('.markdown-wrapper').first().length > 0
      ? $body.find('.markdown-wrapper').first()
      : $body.find('[class*="markdown"]').first()
    
    if ($element.length > 0) {
      const $content = $element.clone()
      
      // Remove sources section
      if (endpoint_name.includes('explore_text')) {
        $content.find('h4:contains("Sources"), h4:contains("Quellen")').nextAll().remove()
        $content.find('h4:contains("Sources"), h4:contains("Quellen")').remove()
      } else {
        $content.find('hr').nextAll().remove()
        $content.find('hr').remove()
      }
      
      actualResponse = $content.text().trim()
    }
    
    cy.writeFile(`rag-ai-evaluator/all_tests/test_test/test_test_${file_suffix}.json`, {
      test_id: `test_000_${file_suffix}`,
      query: query,
      endpoint: endpoint_name,
      user: {
        tier: 'elevate',
        language: language
      },
      prompt: 'main',
      actual_response: actualResponse,
      discovery_data: discoveryData,
      evaluation_criteria: evaluation_criteria
    })
  })

  // Screenshot
 // cy.screenshot(`test-test-react-useeffect-tutorials-${file_suffix}`)
}

export const test_test = () => {
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

  // Test 3: English query on explore-text (using search icon)
  runTest(test_query_en, 'en', 'reader_explore_text', 'explore_en', true)
  
  // Test 4: German query on explore-text (using search icon)
  runTest(test_query_de, 'de', 'reader_explore_text', 'explore_de', true)
}