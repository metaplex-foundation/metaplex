import { PhantomWalletMock, WindowWithPhanWalletMock } from "phan-wallet-mock";
import { connectAndFundWallet } from "../../utils";

import spok from "spok";
const t = spok.adapters.chaiExpect(expect);

function routeForStoreOwner(key: string) {
  return `/#/?network=localhost&store=${key}`;
}

function routeForLocalhost(path: string = "/") {
  return `${path}#/?network=localhost`;
}

let wallet: PhantomWalletMock;
let storeOwner: string;
beforeEach(() => {
  cy.visit(routeForLocalhost())
    .window()
    .then((win: WindowWithPhanWalletMock) => {
      win.localStorage.clear();
      wallet = win.solana;
      storeOwner = wallet.publicKey.toBase58();
    })
    .then(() => connectAndFundWallet(wallet, 2222))
    .then(() => cy.visit(routeForStoreOwner(storeOwner)))
    .window();
});

describe("initializing store and adding creator", () => {
  it("eventually reaches the admin page when clicking init", () => {
    cy.get("button").contains("Init Store").click();

    cy.contains("Add Creator", { timeout: 20000 });
    cy.contains("Submit");
    cy.contains(storeOwner)
      .then(async () =>
        console.log(
          `Init Store Transaction: ${await wallet.lastConfirmedTransactionString()}`
        )
      )
      .then(() => wallet.lastConfirmedTransactionSummary())
      .then((tx) =>
        spok(t, tx, {
          $topic: "Init Store Transaction",
          blockTime: spok.gtz,
          err: spok.notDefined,
          fee: 5000,
          slot: spok.gtz,
        })
      );
  });
});
