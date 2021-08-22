import { BN, web3 } from '@project-serum/anchor';

export interface MasterAccount {
  authority: web3.PublicKey;
  numTokens: BN /** number of tokens available for sale */;
  counter: BN /** the token number up for sale */;
}

export interface Receipt {
  owner: web3.PublicKey /** the buyer */;
  masterAccount: web3.PublicKey /** the master account */;
  tokenNumber: BN /** the purchased token number */;
  amountPaid: BN /** the amount paid */;
}

export interface ReceiptObj {
  publicKey: web3.PublicKey;
  account: Receipt;
}
