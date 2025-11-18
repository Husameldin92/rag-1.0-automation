import {loginHandel, visitWithAuth } from '../auth_login'
const test_query_en = 'How far is Berlin from Hamburg?'
const test_query_de = 'Wie weit ist Berlin von Hamburg?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test 17 Evaluation Criteria
const evaluation_criteria = {
  test_focus: "G17 – Off-domain refusal, no filler (6.b–e) - Strict domain enforcement",
  required_checks: [
    "Assistant refuses or asks to rephrase into software/dev context.",
    "Assistant does NOT answer the non-software question.",
    "Assistant does NOT force reinterpretation just to answer."
  ]
}

export const test17 = () => {
  loginHandel()
  // Handle cookie consent
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // English query: How to implement microservices in Node.js? elevate user tier
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

  // Wait for login to complete
  cy.wait(5000)

  // Handle marketing popup if it appears
  cy.get('body').then(($body) => {
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // Ask the question 
  visitWithAuth('https://staging.entwickler.de/reader/explore')
  cy.get('.rounded-0 > .col-12').type(test_query_en + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_17/test_17_en.json', {
        test_id: 'test_017_en',
        query: test_query_en,
        user: {
          tier: 'elevate',
          language: 'en'
        },
        prompt: 'main',
        actual_response: actualResponse.trim()
      })
    })

  //Screenshot the response
  cy.screenshot('test-17-nodejs-microservices-access-control-en')

  // German query: Wie implementiert man Microservices mit Node.js? elevate user tier
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_17/test_17_de.json', {
        test_id: 'test_017_de',
        query: test_query_de,
        user: {
          tier: 'elevate',
          language: 'de'
        },
        prompt: 'main',
        actual_response: actualResponse.trim()
      })
    })

  //Screenshot the response
  cy.screenshot('test-17-nodejs-microservices-access-control-de')

  // ========================================
  // SECOND ENDPOINT: reader/explore?explore-text=true
  // ========================================

  // Visit the explore-text endpoint
  visitWithAuth('https://staging.entwickler.de/reader/explore/explore-text/')
  
  cy.wait(3000)

  // Handle cookie consent if needed
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // Login user if needed (some pages might require re-login)
  cy.get('body').then(($body) => {
    if ($body.find('#username').length > 0) {
      cy.get('#username').type(user_login_elevate)  
      cy.get('#password').type(user_password)
      cy.get(':nth-child(5) > .woocommerce-Button').click()
      cy.wait(5000)
    }
  })

  // Handle marketing popup if it appears
  cy.get('body').then(($body) => {
    if ($body.find('.modal-body > .col-12 > .d-flex > div > .cursorPointer').length > 0) {
      cy.get('.modal-body > .col-12 > .d-flex > div > .cursorPointer').click()
    }
  })

  // Ask English question on explore-text endpoint
  cy.get('.rounded-0 > .col-12').type(test_query_en + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file (explore-text English)
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_17/test_17_explore_en.json', {
        test_id: 'test_017_explore_en',
        query: test_query_en,
        endpoint: 'reader_explore_text',
        user: {
          tier: 'elevate',
          language: 'en'
        },
        prompt: 'main',
        actual_response: actualResponse.trim()
      })
    })

  //Screenshot the response
  cy.screenshot('test-17-nodejs-microservices-access-control-explore-en')

  // German query on explore-text endpoint
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file (explore-text German)
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_17/test_17_explore_de.json', {
        test_id: 'test_017_explore_de',
        query: test_query_de,
        endpoint: 'reader_explore_text',
        user: { 
          tier: 'elevate',
          language: 'de'
        },
        prompt: 'main',
        actual_response: actualResponse.trim()
      })
    })

  //Screenshot the response
  cy.screenshot('test-17-nodejs-microservices-access-control-explore-de')
} 