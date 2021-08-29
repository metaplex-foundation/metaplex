import { BN, web3 } from '@project-serum/anchor';

interface Data {
  name: any;
  uri: any;
}
export interface MasterAccount {
  authority: web3.PublicKey;
  allocated: BN /** the token number up for sale */;
  data: Data[];
  sold: BN /** the already */;
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
