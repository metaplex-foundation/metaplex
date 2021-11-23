import { PhantomWalletMock, WindowWithPhanWalletMock } from "phan-wallet-mock";
import {
  connectAndFundWallet,
  routeForLocalhost,
  routeForStoreOwner,
} from "../../utils";

import spok from "spok";
const t = spok.adapters.chaiExpect(expect);

describe("initializing store", () => {
  let wallet: PhantomWalletMock;
  let storeOwner: string;
  before(() => {
    cy.visit(routeForLocalhost())
      .window()
      .then((win: WindowWithPhanWalletMock) => {
        win.localStorage.clear();
        wallet = win.solana;
        storeOwner = wallet.publicKey.toBase58();
      })
      .then(() => connectAndFundWallet(wallet, 2222))
      .then(() => cy.visit(routeForStoreOwner(storeOwner)));
  });

  it("eventually reaches the admin page when clicking init", () => {
    cy.contains(/init.*store/i).click();

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
