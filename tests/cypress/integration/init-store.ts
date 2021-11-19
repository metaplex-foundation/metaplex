import { PhantomWalletMock, WindowWithPhanWalletMock } from "phan-wallet-mock";
import { connectAndFundWallet, logWalletBalance } from "../utils";

function routeForStoreOwner(key: string) {
  return `/#/?network=localhost&store=${key}`;
}

function routeForLocalhost(path: string = "/") {
  return `${path}#/?network=localhost`;
}

let wallet: PhantomWalletMock;
before(() => {
  cy.visit(routeForLocalhost())
    .window()
    .then((win: WindowWithPhanWalletMock) => {
      win.localStorage.clear();
      wallet = win.solana;
    })
    .then(() => connectAndFundWallet(wallet, 2222))
    .then(() => cy.visit(routeForStoreOwner(wallet.publicKey.toBase58())))
    .window();
});

describe.only("initialiazing store", () => {
  it("clicks", () => {
    cy.get("button")
      .contains("Init Store")
      .click()
      .then(() => logWalletBalance(wallet));
  });
});
