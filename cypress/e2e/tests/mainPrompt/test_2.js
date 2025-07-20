import {loginHandel, visitWithAuth } from '../auth_login'

const test_query_en = 'Tell me about React useEffect from tutorials only.'
const test_query_de = 'Erkläre mir React useEffect, aber nur anhand von Tutorials.'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

export const test2 = () => {
  loginHandel()
  
  // Handle cookie consent
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // Login with elevate user
  cy.get('#username').type(user_login_elevate)
  cy.get('#password').type(user_password)
  cy.get(':nth-child(5) > .woocommerce-Button').click()

  // Handle case where staging might request password again
  cy.get('body').then(($body) => {
    if ($body.find('#password:visible').length > 0) {
      cy.get('#password').type(user_password)
      cy.get(':nth-child(5) > .woocommerce-Button').click()
    }
  })

  cy.wait(5000)

  // Handle marketing popup if it appears
  cy.get('body').then(($body) => {
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // ========================================
  // ENGLISH TEST: Regular endpoint
  // ========================================
  
  visitWithAuth('https://staging.entwickler.de/reader/explore')

  // Intercept discovery query to capture backend chunk selection
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.query && req.body.query.includes('discovery')) {
      req.alias = 'discoveryQuery'
    }
  }).as('discoveryQuery')

  cy.get('.rounded-0 > .col-12').type(test_query_en + '{enter}')
  cy.wait('@discoveryQuery', { timeout: 30000 })
  cy.wait(40000) // Wait for full AI response

  // Capture discovery data and AI response
  cy.get('@discoveryQuery').then((interception) => {
    cy.get('.markdown-wrapper').invoke('text').then((actualResponse) => {
      
      const evaluation_criteria = {
        test_focus: "Content Type Filtering - Tutorials Only",
        required_checks: [
          "Discovery data must include only chunks with contentType 'tutorial' when user specifies 'tutorials only'",
          "Discovery data must NOT include chunks with other contentTypes (article, event, etc.)",
          "AI response must be based only on tutorial content and mention it's from tutorials",
          "No citations or references to non-tutorial content types should appear in the response"
        ]
      }

      cy.writeFile('rag-ai-evaluator/all_tests/test_2/test_2_en.json', {
        test_id: 'test_002_en',
        query: test_query_en,
        user: { tier: 'elevate', language: 'en' },
        prompt: 'main',
        actual_response: actualResponse.trim(),
        discovery_data: {
          query_sent: interception.request.body.variables?.query || test_query_en,
          results: interception.response.body.data?.discovery?.results || []
        },
        evaluation_criteria: evaluation_criteria
      })
    })
  })

  cy.screenshot('test-2-react-useeffect-tutorials-en')

  // ========================================
  // GERMAN TEST: Regular endpoint  
  // ========================================

  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')
  cy.wait('@discoveryQuery', { timeout: 30000 })
  cy.wait(40000)

  cy.get('@discoveryQuery').then((interception) => {
    cy.get('.markdown-wrapper').invoke('text').then((actualResponse) => {
      
      const evaluation_criteria = {
        test_focus: "Content Type Filtering - Tutorials Only (German)",
        required_checks: [
          "Discovery data must include only chunks with contentType 'tutorial' when user specifies 'nur anhand von Tutorials'", 
          "Discovery data must NOT include chunks with other contentTypes (article, event, etc.)",
          "AI response must be based only on tutorial content and mention it's from tutorials",
          "No citations or references to non-tutorial content types should appear in the response"
        ]
      }

      cy.writeFile('rag-ai-evaluator/all_tests/test_2/test_2_de.json', {
        test_id: 'test_002_de',
        query: test_query_de,
        user: { tier: 'elevate', language: 'de' },
        prompt: 'main', 
        actual_response: actualResponse.trim(),
        discovery_data: {
          query_sent: interception.request.body.variables?.query || test_query_de,
          results: interception.response.body.data?.discovery?.results || []
        },
        evaluation_criteria: evaluation_criteria
      })
    })
  })

  cy.screenshot('test-2-react-useeffect-tutorials-de')

  // ========================================
  // EXPLORE-TEXT ENDPOINT TESTS
  // ========================================

  visitWithAuth('https://staging.entwickler.de/reader/explore/explore-text/')
  cy.wait(3000)

  // Handle cookie consent and login if needed
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
    if ($body.find('#username').length > 0) {
      cy.get('#username').type(user_login_elevate)
      cy.get('#password').type(user_password)
      cy.get(':nth-child(5) > .woocommerce-Button').click()
      cy.wait(5000)
    }
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // English explore-text test
  cy.get('.rounded-0 > .col-12').type(test_query_en + '{enter}')
  cy.wait('@discoveryQuery', { timeout: 30000 })
  cy.wait(40000)

  cy.get('@discoveryQuery').then((interception) => {
    cy.get('.markdown-wrapper').invoke('text').then((actualResponse) => {
      
      const evaluation_criteria = {
        test_focus: "Content Type Filtering - Tutorials Only (Explore Endpoint)",
        required_checks: [
          "Discovery data must include only chunks with contentType 'tutorial' when user specifies 'tutorials only'",
          "Discovery data must NOT include chunks with other contentTypes (article, event, etc.)", 
          "AI response must be based only on tutorial content and mention it's from tutorials",
          "No citations or references to non-tutorial content types should appear in the response"
        ]
      }

      cy.writeFile('rag-ai-evaluator/all_tests/test_2/test_2_explore_en.json', {
        test_id: 'test_002_explore_en',
        query: test_query_en,
        endpoint: 'reader_explore_text',
        user: { tier: 'elevate', language: 'en' },
        prompt: 'main',
        actual_response: actualResponse.trim(),
        discovery_data: {
          query_sent: interception.request.body.variables?.query || test_query_en,
          results: interception.response.body.data?.discovery?.results || []
        },
        evaluation_criteria: evaluation_criteria
      })
    })
  })

  cy.screenshot('test-2-react-useeffect-tutorials-explore-en')

  // German explore-text test
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')
  cy.wait('@discoveryQuery', { timeout: 30000 })
  cy.wait(40000)

  cy.get('@discoveryQuery').then((interception) => {
    cy.get('.markdown-wrapper').invoke('text').then((actualResponse) => {
      
      const evaluation_criteria = {
        test_focus: "Content Type Filtering - Tutorials Only (Explore Endpoint German)",
        required_checks: [
          "Discovery data must include only chunks with contentType 'tutorial' when user specifies 'nur anhand von Tutorials'",
          "Discovery data must NOT include chunks with other contentTypes (article, event, etc.)",
          "AI response must be based only on tutorial content and mention it's from tutorials", 
          "No citations or references to non-tutorial content types should appear in the response"
        ]
      }

      cy.writeFile('rag-ai-evaluator/all_tests/test_2/test_2_explore_de.json', {
        test_id: 'test_002_explore_de', 
        query: test_query_de,
        endpoint: 'reader_explore_text',
        user: { tier: 'elevate', language: 'de' },
        prompt: 'main',
        actual_response: actualResponse.trim(),
        discovery_data: {
          query_sent: interception.request.body.variables?.query || test_query_de,
          results: interception.response.body.data?.discovery?.results || []
        },
        evaluation_criteria: evaluation_criteria
      })
    })
  })

  cy.screenshot('test-2-react-useeffect-tutorials-explore-de')
}
