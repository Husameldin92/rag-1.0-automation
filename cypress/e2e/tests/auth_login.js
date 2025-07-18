export const visitWithAuth = (url) => {
  cy.visit(url, {
    auth: {
      username: 'tester', 
      password: 'thisissandstesting'  
    }
  })
}

export const loginHandel = () => {   
  // Ignore uncaught exceptions from the website
  Cypress.on('uncaught:exception', (err, runnable) => {
    return false;
  });
  
  // Visit login page with basic auth
  visitWithAuth('https://staging.entwickler.de/login/')
  cy.wait(3000)
}