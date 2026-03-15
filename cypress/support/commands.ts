import { SiweMessage } from 'siwe';
import { Wallet } from 'ethers';

const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Hardhat default #0

Cypress.Commands.add('login', () => {
  const wallet = new Wallet(TEST_PRIVATE_KEY);
  
  // 1. Get Nonce
  cy.request('GET', '/api/auth/nonce').then((response) => {
    const nonce = response.body.nonce;
    
    // 2. Create SIWE Message
    const domain = window.location.host;
    const origin = window.location.origin;
    const statement = 'Welcome to AgentFarm X. Sign this message to authenticate.';
    
    const message = new SiweMessage({
      domain,
      address: wallet.address,
      statement,
      uri: origin,
      version: '1',
      chainId: 196,
      nonce,
    });
    
    const preparedMessage = message.prepareMessage();
    
    // 3. Sign Message
    // wallet.signMessage returns a promise, so we need to wrap it
    cy.wrap(wallet.signMessage(preparedMessage)).then((signature) => {
      
      // 4. Login
      cy.request('POST', '/api/auth/login', {
        message: preparedMessage,
        signature,
      }).then((loginResponse) => {
        const { sessionToken } = loginResponse.body;
        
        // 5. Set LocalStorage
        window.localStorage.setItem('sessionToken', sessionToken);
        window.localStorage.setItem('walletAddress', wallet.address);
        
        // 6. Reload to apply
        // cy.reload(); // Optional, depending on when this is called
      });
    });
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      login(): Chainable<void>;
    }
  }
}
