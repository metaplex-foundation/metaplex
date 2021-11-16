import { PhantomWalletMock } from 'phan-wallet-mock'
import debug from 'debug'
import { clusterApiUrl } from '@solana/web3.js'

localStorage.debug = 'mp-test:*'
debug.log = console.log.bind(console)

export const logInfo = debug('mp-test:info')
export const logDebug = debug('mp-test:debug')

export const MAINNET_BETA = 'https://api.metaplex.solana.com'
export const LOCALNET = 'http://localhost:8899'
export const DEVNET = clusterApiUrl('devnet')

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
      logInfo(
        `Wallet '%s' initialized with %s SOL`,
        wallet.publicKey.toBase58(),
        balance.toFixed(2)
      )
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
export const forceDevNet = () => {
  // Always use local validator for testing
  return cy.intercept(MAINNET_BETA, (req) => {
    logDebug(
      `Redirecting request to 'mainnet-beta' (${MAINNET_BETA}) to 'devnet' (${DEVNET})`
    )
    req.url = req.url.replace(MAINNET_BETA, DEVNET)
  })
}

export const logWalletBalance = async (wallet: PhantomWalletMock) => {
  const sol = await wallet.getBalanceSol()
  logInfo('Wallet balance: %s SOL', sol.toFixed(9))
}
