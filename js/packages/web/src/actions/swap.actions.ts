import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Account, Connection, ParsedAccountData, AccountInfo, TokenAccountsFilter } from "@solana/web3.js";
import { SWAP_ADDRESS } from '../models/Swap.model';
import { TokenSwap, TOKEN_SWAP_PROGRAM_ID } from '../program/TokenSwap';

let tokenSwap: TokenSwap;

let amountIn: number;
let amountOut: number;
let isReverse = false;
let tokenAccountA: AccountInfo<Buffer | ParsedAccountData> | null;
let tokenAccountB: AccountInfo<Buffer | ParsedAccountData> | null;
let account: Account;
let connection: Connection;

export async function initTokenSwap(conn: Connection, acc: Account): Promise<void> {
  connection = conn;
  account = acc;
  tokenSwap = await TokenSwap.loadTokenSwap(conn, SWAP_ADDRESS, TOKEN_SWAP_PROGRAM_ID, acc);
  console.log('--tokenSwap', tokenSwap);
}

export async function initTokenAccounts(connection: Connection): Promise<void> {
  tokenAccountA = (await connection.getParsedAccountInfo(tokenSwap.tokenAccountA)).value;
  tokenAccountB = (await connection.getParsedAccountInfo(tokenSwap.tokenAccountB)).value;
}

export function setIsReverse(value: boolean) {
  isReverse = value;
  updateAmountOut();
}

export function setAmountIn(value: number) {
  let tokenData = (isReverse ? tokenAccountB!.data : tokenAccountA!.data) as ParsedAccountData;
  let decimals = tokenData.parsed['info']['tokenAmount']['decimals'];
  amountIn = value * Math.pow(10, decimals);
  updateAmountOut();
}

export function getAmountOut(): number {
  let tokenData = (isReverse ? tokenAccountA!.data : tokenAccountB!.data) as ParsedAccountData;
  let decimals = tokenData.parsed['info']['tokenAmount']['decimals'];
  return amountOut / Math.pow(10, decimals);
}

export async function swap(): Promise<void> {
  let tokenAccounts = await connection.getParsedTokenAccountsByOwner(account.publicKey, { programId: TOKEN_PROGRAM_ID } as TokenAccountsFilter);
  let mintAAddress = (tokenAccountA!.data as ParsedAccountData).parsed['info']['mint'];
  let mintBAddress = (tokenAccountB!.data as ParsedAccountData).parsed['info']['mint'];
  let mintA = new Token(connection, mintAAddress, TOKEN_PROGRAM_ID, account);
  let mintB = new Token(connection, mintBAddress, TOKEN_PROGRAM_ID, account);
  let userTokenAccountA;
  let userTokenAccountB;
  tokenAccounts.value.forEach(function (item) {
    let tokenAccMint = item.account.data.parsed['info']['mint'];
    if (tokenAccMint == mintAAddress) {
      userTokenAccountA = item.pubkey;
    }
    if (tokenAccMint == mintBAddress) {
      userTokenAccountB = item.pubkey;
    }
  });
  if (userTokenAccountA == null) {
    userTokenAccountA = await mintA.createAccount(account.publicKey);
  }
  if (userTokenAccountB == null) {
    userTokenAccountB = await mintB.createAccount(account.publicKey);
  }

  await tokenSwap.swap(
    isReverse ? userTokenAccountB :userTokenAccountA ,
    isReverse ? tokenSwap.tokenAccountB : tokenSwap.tokenAccountA,
    isReverse ? tokenSwap.tokenAccountA : tokenSwap.tokenAccountB,
    isReverse ? userTokenAccountA : userTokenAccountB,
    null,
    account,
    amountIn,
    amountOut,
  );

}

function updateAmountOut() {
  if (tokenAccountA != null && tokenAccountB != null) {
    let tokenAAmount = parseInt((tokenAccountA!.data as ParsedAccountData).parsed['info']['tokenAmount']['amount']);
    let tokenBAmount = parseInt((tokenAccountB!.data as ParsedAccountData).parsed['info']['tokenAmount']['amount']);
    let aTotal = isReverse ? tokenBAmount : tokenAAmount;
    let bTotal = isReverse ? tokenAAmount : tokenBAmount;
    amountOut = calculateAmountOut(aTotal, bTotal);
  }
}

function calculateAmountOut(aTotal: number, bTotal: number) {
  if (aTotal == 0 && bTotal == 0) {
    return 0;
  }
  let out = bTotal - (aTotal * bTotal) / (aTotal + amountIn);
  var tradeFeeNumerator = tokenSwap.tradeFeeNumerator.toNumber();
  var tradeFeeDenominator = tokenSwap.tradeFeeDenominator.toNumber();
  var ownerTradeFeeNumerator = tokenSwap.ownerTradeFeeNumerator.toNumber();
  var ownerTradeFeeDenominator = tokenSwap.ownerTradeFeeDenominator.toNumber();
  var ownerWithdrawFeeNumerator = tokenSwap.ownerWithdrawFeeNumerator.toNumber();
  var ownerWithdrawFeeDenominator = tokenSwap.ownerWithdrawFeeDenominator.toNumber();
  var tradeFee = (tradeFeeNumerator == 0 || tradeFeeDenominator == 0) ? 0 : (tradeFeeNumerator ?? 0) / (tradeFeeDenominator ?? 1);
  var ownerTradeFee = (ownerTradeFeeNumerator == 0 ||
    ownerTradeFeeDenominator == 0)
    ? 0
    : (ownerTradeFeeNumerator ?? 0) /
    (ownerTradeFeeDenominator ?? 1);
  var ownerWithdrawFee = (ownerWithdrawFeeNumerator == 0 ||
    ownerWithdrawFeeDenominator == 0)
    ? 0
    : (ownerWithdrawFeeNumerator ?? 0) /
    (ownerWithdrawFeeDenominator ?? 1);
  var toCoinAmountWithoutFee = (out ?? 0) *
    (1 - tradeFee - ownerTradeFee - ownerWithdrawFee);

  return Math.floor(toCoinAmountWithoutFee);
}
