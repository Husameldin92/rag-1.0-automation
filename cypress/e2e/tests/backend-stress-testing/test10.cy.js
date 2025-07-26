import {loginHandel, visitWithAuth } from '../auth_login'
const user_login_elevate = 'hosman+rag9@basta.net'
const user_password = 'Hossamaccent2015+'



it('Test 10: Stress Testing_10', () => {
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
  visitWithAuth('https://staging.entwickler.de/reader/explore')
  cy.get('.rounded-0 > .col-12').clear()
  cy.get('.rounded-0 > .col-12').type('what is the best way to learn java?{enter}')
  cy.wait(50000)
  cy.screenshot('backend-stress-testing-test10 ')
    })