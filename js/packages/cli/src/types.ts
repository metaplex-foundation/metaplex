import { BN } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

export class Creator {
  address: PublicKey;
  verified: boolean;
  share: number;

  constructor(args: {
    address: PublicKey;
    verified: boolean;
    share: number;
  }) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }
}

export interface Config {
  authority: PublicKey;
  data: ConfigData;
}

export class ConfigData {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Creator[] | null;
  maxNumberOfLines: BN | number;
  isMutable: boolean;
  maxSupply: BN;
  retainAuthority: boolean;

  constructor(args: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
    maxNumberOfLines: BN;
    isMutable: boolean;
    maxSupply: BN;
    retainAuthority: boolean;
  }) {
    this.name = args.name;
    this.symbol = args.symbol;
    this.uri = args.uri;
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
    this.creators = args.creators;
    this.maxNumberOfLines = args.maxNumberOfLines;
    this.isMutable = args.isMutable;
    this.maxSupply = args.maxSupply;
    this.retainAuthority = args.retainAuthority;
  }
}
