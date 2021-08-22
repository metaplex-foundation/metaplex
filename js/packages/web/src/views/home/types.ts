import { web3 } from '@project-serum/anchor';

export interface MasterAccount {
  authority: web3.PublicKey;
  numTokens: number /** number of tokens available for sale */;
  counter: number /** the token number up for sale */;
}

export interface Receipt {
  owner: web3.PublicKey /** the buyer */;
  masterAccount: web3.PublicKey /** the master account */;
  tokenNumber: number /** the purchased token number */;
  amountPaid: number /** the amount paid */;
}

export interface ReceiptObj {
  publicKey: web3.PublicKey;
  account: Receipt;
}
