import { PhantomWalletMock, WindowWithPhanWalletMock } from "phan-wallet-mock";
import { routeForLocalhost } from "../../utils";

describe("connect-wallet success cases", () => {
  let wallet: PhantomWalletMock;
  beforeEach(() => {
    cy.visit(routeForLocalhost());
    cy.window().then((win: WindowWithPhanWalletMock) => {
      wallet = win.solana;
      return wallet.disconnect();
    });
  });

  describe(`Connects Wallet via 'Connect Wallet' menu button -> Connect to Phantom`, () => {
    it("finds button, connects wallet via click", () => {
      expect(wallet.isConnected, "wallet is not connected").false;
      cy.get("#desktop-navbar")
        .find(".connector")
        .click()
        .get(".phantom-button")
        .click()
        .then(() => expect(wallet.isConnected, "wallet is connected").true)
        .get("div")
        .contains(/Connected to wallet/i)
        .get(".loader-container.active");
    });
  });

  describe(`Connects Wallet via 'Connect to configure store'`, () => {
    it("finds button and connects wallet via click", () => {
      expect(wallet.isConnected, "wallet is not connected").false;
      cy.get("button")
        .contains("Connect")
        .click()
        .get(".phantom-button")
        .click()
        .then(() => expect(wallet.isConnected, "wallet is connected").true)
        .get("div")
        .contains(/Connected to wallet/i)
        .get(".loader-container.active");
    });
  });
});
