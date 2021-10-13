import { sendSignedTransaction, sendTransactionWithRetry } from '@oyster/common';
import { Token, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Account, AccountInfo, Connection, ParsedAccountData, PublicKey, TokenAccountsFilter, Transaction } from '@solana/web3.js';
import { signTransaction } from 'borsh/borsh-ts/test/fuzz/transaction-example/transaction';
import { TOKEN_SWAP_PROGRAM_ID, TokenSwap } from '../program/TokenSwap';

let tokenSwap: TokenSwap;

const SWAP_ADDRESS = new PublicKey('gszXA2RmCDbLHuJaV2YcUsHrFydHPMzo1okMLkp4uTw');

let amountIn: number;
let amountOut: number;
let isReverse = false;
// lstart
let tokenAccountA: AccountInfo<Buffer | ParsedAccountData> | null;
// usdc
let tokenAccountB: AccountInfo<Buffer | ParsedAccountData> | null;
let userPubkey: PublicKey;
let connection: Connection;
let acc: Account;
let userTokenAccounts: Array<{
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData>;
}>;
let userTokenAAcc: {
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData>;
} | null;
let userTokenBAcc: {
  pubkey: PublicKey;
  account: AccountInfo<ParsedAccountData>;
} | null;

let wallet;

export async function initTokenSwap(conn: Connection, userWallet: any): Promise<void> {
  acc = new Account();
  connection = conn;
  wallet = userWallet;
  userPubkey = wallet.publicKey;
  tokenSwap = await TokenSwap.loadTokenSwap(conn, SWAP_ADDRESS, TOKEN_SWAP_PROGRAM_ID, acc);
}

export async function initTokenAccounts(): Promise<void> {
  tokenAccountA = (await connection.getParsedAccountInfo(tokenSwap.tokenAccountA)).value;
  tokenAccountB = (await connection.getParsedAccountInfo(tokenSwap.tokenAccountB)).value;
}

export async function updateUserTokenAccounts(): Promise<void> {
  userTokenAccounts = (await connection.getParsedTokenAccountsByOwner(userPubkey, { programId: TOKEN_PROGRAM_ID } as TokenAccountsFilter)).value;
  let mintAAddress = (tokenAccountA!.data as ParsedAccountData).parsed['info']['mint'];
  let mintBAddress = (tokenAccountB!.data as ParsedAccountData).parsed['info']['mint'];
  userTokenAccounts.forEach(function (item) {
    let tokenAccMint = item.account.data.parsed['info']['mint'];
    if (tokenAccMint == mintAAddress) {
      userTokenAAcc = item;
    }
    if (tokenAccMint == mintBAddress) {
      userTokenBAcc = item;
    }
  });
}

export function getUserTokenABalance() {
  if (!userTokenAAcc) {
    return 0;
  }
  return userTokenAAcc.account.data.parsed['info']['tokenAmount']['uiAmount']
}

export function getUserTokenBBalance() {
  if (!userTokenBAcc) {
    return 0;
  }
  return userTokenBAcc.account.data.parsed['info']['tokenAmount']['uiAmount']
}

export function setIsReverse() {
  isReverse = !isReverse;
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

export function isUserTokenAAccount(): boolean {
  return userTokenAAcc != null;
}

export function isUserTokenBAccount(): boolean {
  return userTokenBAcc != null;
}

export async function signAndSendTx(tx: Transaction) {
  tx.recentBlockhash = (await connection.getRecentBlockhash('finalized')).blockhash;
  tx.feePayer = userPubkey;
  const signedTransaction = await wallet.signTransaction(tx);
  await sendSignedTransaction({
    connection,
    signedTransaction,
  });
  return true;
}

export async function createTokenATransaction(): Promise<any> {
  let mintAAddress = new PublicKey((tokenAccountA!.data as ParsedAccountData).parsed['info']['mint']);
  let mintA = new Token(connection, mintAAddress, TOKEN_PROGRAM_ID, acc);
  const associatedAddress = await Token.getAssociatedTokenAddress(mintA.associatedProgramId, mintA.programId, mintA.publicKey, userPubkey);
  const transaction = new Transaction().add(Token.createAssociatedTokenAccountInstruction(mintA.associatedProgramId, mintA.programId, mintA.publicKey, associatedAddress, userPubkey, userPubkey));
  return signAndSendTx(transaction);
}

export async function createTokenBTransaction(): Promise<any> {
  let mintBAddress = new PublicKey((tokenAccountB!.data as ParsedAccountData).parsed['info']['mint']);
  let mintB = new Token(connection, mintBAddress, TOKEN_PROGRAM_ID, acc);
  const associatedAddress = await Token.getAssociatedTokenAddress(mintB.associatedProgramId, mintB.programId, mintB.publicKey, userPubkey);
  const transaction = new Transaction().add(Token.createAssociatedTokenAccountInstruction(mintB.associatedProgramId, mintB.programId, mintB.publicKey, associatedAddress, userPubkey, userPubkey));
  return signAndSendTx(transaction);
}

export async function swap(): Promise<any> {
  let userTokenAccountA = userTokenAAcc!.pubkey;
  let userTokenAccountB = userTokenBAcc!.pubkey;
  let transaction = new Transaction();

  console.log('--swap', amountIn, amountOut)

  let swapInstruction = TokenSwap.swapInstruction(
    tokenSwap.tokenSwap,
    tokenSwap.authority,
    userPubkey,
    isReverse ? userTokenAccountB : userTokenAccountA,
    isReverse ? tokenSwap.tokenAccountB : tokenSwap.tokenAccountA,
    isReverse ? tokenSwap.tokenAccountA : tokenSwap.tokenAccountB,
    isReverse ? userTokenAccountA : userTokenAccountB,
    tokenSwap.poolToken,
    tokenSwap.feeAccount,
    null,
    tokenSwap.swapProgramId,
    tokenSwap.tokenProgramId,
    amountIn,
    amountOut,
  );
  transaction.add(swapInstruction);
  return signAndSendTx(transaction);

}

export function getPoolBalanceA() {

}

function updateAmountOut() {
  if (tokenAccountA != null && tokenAccountB != null) {
    let tokenAAmount = parseInt((tokenAccountA!.data as ParsedAccountData).parsed['info']['tokenAmount']['amount']);
    let tokenBAmount = parseInt((tokenAccountB!.data as ParsedAccountData).parsed['info']['tokenAmount']['amount']);
    let aTotal = isReverse ? tokenBAmount : tokenAAmount;
    let bTotal = isReverse ? tokenAAmount : tokenBAmount;

    console.log('--aaa', aTotal/1000000, bTotal/1000000)

    amountOut = calculateAmountOut(aTotal , bTotal);
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
