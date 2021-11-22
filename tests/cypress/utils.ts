import { PhantomWalletMock } from "phan-wallet-mock";
import debug from "debug";
import { clusterApiUrl } from "@solana/web3.js";

export const logInfo = debug("mp-test:info");
export const logDebug = debug("mp-test:debug");

export const MAINNET_BETA = "https://api.metaplex.solana.com";
export const LOCALNET = "http://localhost:8899";
export const DEVNET = clusterApiUrl("devnet");

export const COINGECKO_PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price";

export const connectWallet = (wallet: PhantomWalletMock) =>
  cy
    .get("#desktop-navbar")
    .find(".connector")
    .click()
    .get(".phantom-button")
    .click()
    .then(
      () => expect(wallet.isConnected, "wallet should have connected").true
    );

export const connectAndFundWallet = async (
  wallet: PhantomWalletMock,
  sol = 1
) => {
  connectWallet(wallet)
    .then(() => wallet.requestAirdrop(sol))
    .then(async () => {
      const balance = await wallet.getBalanceSol();
      logInfo(
        `Wallet '%s' initialized with %s SOL`,
        wallet.publicKey.toBase58(),
        balance.toFixed(2)
      );
    });
};

export const logWalletBalance = async (wallet: PhantomWalletMock) => {
  const sol = await wallet.getBalanceSol();
  logInfo("Wallet balance: %s SOL", sol.toFixed(9));
};

export const useLocalCoingecko = () => {
  console.log("WIP: intercepting");
  return cy.intercept(`${COINGECKO_PRICE_URL}*`, (req) => {
    const ids = req.query.ids;
    let res = {};
    try {
      res = require(`./fixtures/canned-responses/coingecko-price-${ids}-usd.json`);
    } catch (_) {
      console.warn(`Requested unknown price ${req.query.ids}`);
    }
    req.reply(res);
  });
};
