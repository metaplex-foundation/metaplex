import { PhantomWalletMock, WindowWithPhanWalletMock } from 'phan-wallet-mock'
import {
  connectAndFundWallet,
  forceDevNet,
  forceLocalNet,
  logWalletBalance,
} from '../utils'

const USE_DEVNET = false
let wallet: PhantomWalletMock
before(() => {
  cy.visit('/')
  cy.window()
    .then((win: WindowWithPhanWalletMock) => {
      wallet = win.solana
    })
    .then(() => (USE_DEVNET ? forceDevNet() : forceLocalNet()))
    .then(() => connectAndFundWallet(wallet, 10))
})

describe.only('initialiazing store', () => {
  it('clicks', () => {
    cy.get('button')
      .contains('Init Store')
      .click()
      .then(() => logWalletBalance(wallet))
  })
})
