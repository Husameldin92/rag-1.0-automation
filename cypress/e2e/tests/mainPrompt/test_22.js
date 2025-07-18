import {loginHandel, visitWithAuth } from '../auth_login'
const test_query_en = 'I\'m a backend developer. Show me relevant tutorials.'
const test_query_de = 'Ich bin Backend-Entwickler. Zeig mir passende Tutorials.'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

export const test22 = () => {
  loginHandel()
  // Handle cookie consent
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // English query: I'm a backend developer. Show me relevant tutorials. elevate user tier
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
      cy.writeFile('rag-ai-evaluator/all_tests/test_22/test_22_en.json', {
        test_id: 'test_022_en',
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
  cy.screenshot('test-22-backend-developer-user-context-en')

  // German query: Ich bin Backend-Entwickler. Zeig mir passende Tutorials. elevate user tier
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_22/test_22_de.json', {
        test_id: 'test_022_de',
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
  cy.screenshot('test-22-backend-developer-user-context-de')

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
      cy.writeFile('rag-ai-evaluator/all_tests/test_22/test_22_explore_en.json', {
        test_id: 'test_022_explore_en',
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
  cy.screenshot('test-22-backend-developer-user-context-explore-en')

  // German query on explore-text endpoint
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file (explore-text German)
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_22/test_22_explore_de.json', {
        test_id: 'test_022_explore_de',
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
  cy.screenshot('test-22-backend-developer-user-context-explore-de')
} 