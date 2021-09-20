import { BN } from '@project-serum/anchor';
import { PublicKey, AccountInfo } from '@solana/web3.js';

export class Creator {
  address: PublicKey;
  verified: boolean;
  share: number;

  constructor(args: { address: PublicKey; verified: boolean; share: number }) {
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

export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};

export enum MetadataKey {
  Uninitialized = 0,
  MetadataV1 = 4,
  EditionV1 = 1,
  MasterEditionV1 = 2,
  MasterEditionV2 = 6,
  EditionMarker = 7,
}

export class MasterEditionV1 {
  key: MetadataKey;
  supply: BN;
  maxSupply?: BN;
  printingMint: PublicKey;
  oneTimePrintingAuthorizationMint: PublicKey;
  constructor(args: {
    key: MetadataKey;
    supply: BN;
    maxSupply?: BN;
    printingMint: PublicKey;
    oneTimePrintingAuthorizationMint: PublicKey;
  }) {
    this.key = MetadataKey.MasterEditionV1;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
    this.printingMint = args.printingMint;
    this.oneTimePrintingAuthorizationMint =
      args.oneTimePrintingAuthorizationMint;
  }
}

export class MasterEditionV2 {
  key: MetadataKey;
  supply: BN;
  maxSupply?: BN;
  constructor(args: { key: MetadataKey; supply: BN; maxSupply?: BN }) {
    this.key = MetadataKey.MasterEditionV2;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
  }
}

export class EditionMarker {
  key: MetadataKey;
  ledger: number[];
  constructor(args: { key: MetadataKey; ledger: number[] }) {
    this.key = MetadataKey.EditionMarker;
    this.ledger = args.ledger;
  }
}

export class Edition {
  key: MetadataKey;
  parent: PublicKey;
  edition: BN;
  constructor(args: { key: MetadataKey; parent: PublicKey; edition: BN }) {
    this.key = MetadataKey.EditionV1;
    this.parent = args.parent;
    this.edition = args.edition;
  }
}

export class Data {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Creator[] | null;
  constructor(args: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
  }) {
    this.name = args.name;
    this.symbol = args.symbol;
    this.uri = args.uri;
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
    this.creators = args.creators;
  }
}

export class Metadata {
  key: MetadataKey;
  updateAuthority: PublicKey;
  mint: PublicKey;
  data: Data;
  primarySaleHappened: boolean;
  isMutable: boolean;
  masterEdition?: PublicKey;
  edition?: PublicKey;
  constructor(args: {
    updateAuthority: PublicKey;
    mint: PublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    masterEdition?: PublicKey;
  }) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
  }
}

export const METADATA_SCHEMA = new Map<any, any>([
  [
    MasterEditionV1,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
        ['printingMint', 'pubkey'],
        ['oneTimePrintingAuthorizationMint', [32]],
      ],
    },
  ],
  [
    MasterEditionV2,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['supply', 'u64'],
        ['maxSupply', { kind: 'option', type: 'u64' }],
      ],
    },
  ],
  [
    Edition,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['parent', [32]],
        ['edition', 'u64'],
      ],
    },
  ],
  [
    Data,
    {
      kind: 'struct',
      fields: [
        ['name', 'string'],
        ['symbol', 'string'],
        ['uri', 'string'],
        ['sellerFeeBasisPoints', 'u16'],
        ['creators', { kind: 'option', type: [Creator] }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: 'struct',
      fields: [
        ['address', [32]],
        ['verified', 'u8'],
        ['share', 'u8'],
      ],
    },
  ],
  [
    Metadata,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['updateAuthority', [32]],
        ['mint', [32]],
        ['data', Data],
        ['primarySaleHappened', 'u8'],
        ['isMutable', 'u8'],
      ],
    },
  ],
  [
    EditionMarker,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['ledger', [31]],
      ],
    },
  ],
]);
