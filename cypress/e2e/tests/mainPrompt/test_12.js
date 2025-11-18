import {loginHandel, visitWithAuth } from '../auth_login'
const test_query_en = 'How do I enable feature X in the newest Angular if it’s not in your docs?'
const test_query_de = 'Wie aktiviere ich Feature X im neuesten Angular, wenn es in euren Dokumenten nicht steht?'
const user_login_elevate = 'hosman+1@jax.de'
const user_password = 'Hossamaccent2015+'

// Test 12 Evaluation Criteria 
const evaluation_criteria = {
  test_focus: "G12 – Tech fallback, no citation (4.j)",
  required_checks: [
    "Assistant clearly says the feature is not explicitly covered in retrieved chunks.",
    "Assistant suggests a generic/typical solution for that tech.",
    "Assistant does NOT add [[[CID:...]]] to the generic part.",
    "Structure is still respected."
  ]
}

export const test12 = () => {
  loginHandel()
  // Handle cookie consent
  cy.get('body').then(($body) => {
    if ($body.find(':contains("Alle akzeptieren")').length > 0) {
      cy.contains('Alle akzeptieren', { timeout: 10000 }).click()
    }
  })

  // English query: How does Angular handle routing? elevate user tier
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
      cy.writeFile('rag-ai-evaluator/all_tests/test_12/test_12_en.json', {
        test_id: 'test_012_en',
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
  cy.screenshot('test-12-angular-feature-x-en')

  // German query: Wie funktioniert das Routing in Angular? elevate user tier
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_12/test_12_de.json', {
        test_id: 'test_012_de',
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
  cy.screenshot('test-12-angular-feature-x-de')

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
      cy.writeFile('rag-ai-evaluator/all_tests/test_12/test_12_explore_en.json', {
        test_id: 'test_012_explore_en',
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
  cy.screenshot('test-12-angular-routing-explore-en')

  // German query on explore-text endpoint
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type(test_query_de + '{enter}')

  // Wait for AI response to appear
  cy.wait(40000)

  // Extract the AI response and write to file (explore-text German)
  cy.get('.markdown-wrapper') 
    .invoke('text')
    .then((actualResponse) => {
      cy.writeFile('rag-ai-evaluator/all_tests/test_12/test_12_explore_de.json', {
        test_id: 'test_012_explore_de',
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
  cy.screenshot('test-12-angular-routing-explore-de')
} 