import { PhantomWalletMock } from 'phan-wallet-mock'
import debug from 'debug'

localStorage.debug = 'mp-test:*'
debug.log = console.log.bind(console)

export const logInfo = debug('mp-test:info')

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
