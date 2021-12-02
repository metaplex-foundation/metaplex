import { PhantomWalletMock } from "phan-wallet-mock";
import { ensureFundedStore } from "../../utils";

import spok from "spok";
import { PUBLIC_KEYS } from "../../../common/public-keys";

const t = spok.adapters.chaiExpect(expect);

function addCreator(publicKey: string) {
  cy.contains(/add creator/i).click();
  const modal = cy.contains(/add new artist/i);
  return modal
    .get("input")
    .type(publicKey, { delay: 1 })
    .then(() => cy.contains(/ok/i).click());
}

function submit() {
  return cy.contains(/submit/i).click();
}

describe("Given an initialized and funded store", () => {
  let wallet: PhantomWalletMock;
  before(() => {
    ensureFundedStore(1000).then((res) => {
      wallet = res.wallet;
    });
  });

  describe("adding alice", () => {
    const publicKey = PUBLIC_KEYS["acc:creator_alice"];
    before(() => addCreator(publicKey));
    it("adds alice and shows it in the table", () => cy.contains(publicKey));
  });

  describe("adding bob", () => {
    const publicKey = PUBLIC_KEYS["acc:creator_bob"];
    before(() => addCreator(publicKey));
    it("adds bob and shows it in the table", () => cy.contains(publicKey));
  });

  describe("submitting creators", () => {
    before(submit);

    it("shows saving + saved feedback", () => {
      cy.contains(/saving/i, { timeout: 5000 }).then(() =>
        cy.contains(/saved/i, { timeout: 5000 })
      );
    });

    it("transmits whitelist creator transaction", () => {
      cy.then(async () =>
        console.log(
          `Init Store Transaction: ${await wallet.lastConfirmedTransactionString()}`
        )
      )
        .then(() => wallet.lastConfirmedTransactionSummary())
        .then((tx) =>
          spok(t, tx, {
            $topic: "Submit Creators Transaction",
            blockTime: spok.gtz,
            err: spok.notDefined,
            fee: 5000,
            slot: spok.gtz,
            logMessages: function indicateSuccessfullWhitelistCreatorTx(
              msgs: string[]
            ) {
              return (
                msgs.some((msg) =>
                  /instruction.*set.*whitelisted creator/i.test(msg)
                ) && msgs.some((msg) => /completed assignation/i.test(msg))
              );
            },
          })
        );
    });
  });
});
