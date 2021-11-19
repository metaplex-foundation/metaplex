import { PhantomWalletMock, WindowWithPhanWalletMock } from "phan-wallet-mock";
import { connectAndFundWallet, logWalletBalance } from "../utils";

function routeForStoreOwner(key: string) {
  return `/#/?network=localhost&store=${key}`;
}

function routeForLocalhost(path: string = "/") {
  return `${path}#/?network=localhost`;
}

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
    .then(() => cy.visit(routeForStoreOwner(storeOwner)))
    .window();
});

describe.only("initializing store and adding creator", () => {
  it("eventually reaches the admin page when clicking init", () => {
    cy.get("button").contains("Init Store").click();

    cy.contains("Add Creator", { timeout: 20000 });
    cy.contains("Submit");
    cy.contains(storeOwner).then(() => {
      // Check transaction
    });
  });
});
