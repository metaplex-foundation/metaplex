import { PhantomWalletMock } from 'phan-wallet-mock'
import debug from 'debug'

localStorage.debug = 'mp-test:*'
debug.log = console.log.bind(console)

export const logInfo = debug('mp-test:info')
export const logDebug = debug('mp-test:debug')

export const MAINNET_BETA = 'https://api.metaplex.solana.com/'
export const LOCALNET = 'http://localhost:8899'

export const connectAndFundWallet = async (
  wallet: PhantomWalletMock,
  sol = 1
) => {
  cy.get('#desktop-navbar')
    .find('.connector')
    .click()
    .get('.phantom-button')
    .click()
    .then(() => expect(wallet.isConnected, 'wallet should have connected').true)
    .then(() => wallet.requestAirdrop(sol))
    .then(async () => {
      const balance = await wallet.getBalanceSol()
      logInfo('Wallet initialized with %s SOL', balance.toFixed(2))
    })
}

// TODO(thlorenz): I tried to add this to cypress/support/index.ts
// `before|beforeEach` but it doesn't apply reliably that way, so for now all
// tests have to call this as part of the setup
export const forceLocalNet = () => {
  // Always use local validator for testing
  return cy.intercept(MAINNET_BETA, (req) => {
    logDebug(
      `Redirecting request to 'mainnet-beta' (${MAINNET_BETA}) to 'localnet' (${LOCALNET})`
    )
    req.url = req.url.replace(MAINNET_BETA, LOCALNET)
  })
}
