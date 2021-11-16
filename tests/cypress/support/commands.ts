// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

import { PhantomWalletMock, WindowWithPhanWalletMock } from 'phan-wallet-mock'

type KChain = keyof Cypress.Chainable
// @ts-ignore
const connectAndFundWallet: Cypress.Chainable[KChain] = async (
  win: WindowWithPhanWalletMock,
  sol = 1
) => {
  const wallet = win.solana
  await wallet.connect()
  await wallet.requestAirdrop(sol)
}

Cypress.Commands.add('connectAndFundWallet' as KChain, connectAndFundWallet)
