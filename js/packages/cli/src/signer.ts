import { Keypair, PublicKey, TransactionInstruction, Connection, AccountInfo } from '@solana/web3.js';
import { sendTransactionWithRetryWithKeypair } from './helpers/transactions';
import BN from "bn.js";
import * as borsh from "borsh"
/*
 Get accounts by candy machine creator address
 Get only verified ones
 Get only unverified ones with creator address
 Grab n at a time and batch sign and send transaction

 PS: Don't sign candy machine addresses that you do not know about. Signing verifies your participation.
*/
const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const METADATA_PROGRAM_ID = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};

enum MetadataKey {
  Uninitialized = 0,
  MetadataV1 = 4,
  EditionV1 = 1,
  MasterEditionV1 = 2,
  MasterEditionV2 = 6,
  EditionMarker = 7
}

class MasterEditionV1 {
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
  };
}

class MasterEditionV2 {
  key: MetadataKey;
  supply: BN;
  maxSupply?: BN;
  constructor(args: {
    key: MetadataKey;
    supply: BN;
    maxSupply?: BN;
  }) {
    this.key = MetadataKey.MasterEditionV2;
    this.supply = args.supply;
    this.maxSupply = args.maxSupply;
  };
}

class EditionMarker {
  key: MetadataKey;
  ledger: number[];
  constructor(args: {
    key: MetadataKey;
    ledger: number[];
  }) {
    this.key = MetadataKey.EditionMarker;
    this.ledger = args.ledger;
  };
}

class Edition {
  key: MetadataKey;
  parent: PublicKey;
  edition: BN;
  constructor(args: {
    key: MetadataKey;
    parent: PublicKey;
    edition: BN;
  }) {
    this.key = MetadataKey.EditionV1;
    this.parent = args.parent;
    this.edition = args.edition;
  };
}

class Creator {
  address: string;
  verified: boolean;
  share: number;

  constructor(args: {
    address: string;
    verified: boolean;
    share: number;
  }) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }
}

class Data {
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
  };
}

class Metadata {
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
  };
}

const METADATA_SCHEMA = new Map<any, any>([
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

async function decodeMetadata(buffer) {
  const metadata = borsh.deserializeUnchecked(METADATA_SCHEMA, Metadata, buffer);
  return metadata;
};

async function getProgramAccounts(
  connection: Connection,
  programId: String,
  configOrCommitment?: any,
): Promise<Array<AccountAndPubkey>> {
  const extra: any = {};
  let commitment;
  //let encoding;

  if (configOrCommitment) {
    if (typeof configOrCommitment === 'string') {
      commitment = configOrCommitment;
    } else {
      commitment = configOrCommitment.commitment;
      //encoding = configOrCommitment.encoding;

      if (configOrCommitment.dataSlice) {
        extra.dataSlice = configOrCommitment.dataSlice;
      }

      if (configOrCommitment.filters) {
        extra.filters = configOrCommitment.filters;
      }
    }
  }

  const args = connection._buildArgs([programId], commitment, 'base64', extra);
  const unsafeRes = await (connection as any)._rpcRequest(
    'getProgramAccounts',
    args,
  );
  //console.log(unsafeRes)
  const data = (
    unsafeRes.result as Array<{
      account: AccountInfo<[string, string]>;
      pubkey: string;
    }>
  ).map(item => {
    return {
      account: {
        // TODO: possible delay parsing could be added here
        data: Buffer.from(item.account.data[0], 'base64'),
        executable: item.account.executable,
        lamports: item.account.lamports,
        // TODO: maybe we can do it in lazy way? or just use string
        owner: item.account.owner,
      } as AccountInfo<Buffer>,
      pubkey: item.pubkey,
    };
  });

  return data;
}

export async function signAllMetadataFromCandyMachine(
  connection, 
  wallet, 
  candyMachineAddress, 
  batchSize
  ){
  let metadataByCandyMachine = await getAccountsByCreatorAddress(candyMachineAddress, connection)
  console.log(`Found ${metadataByCandyMachine.length} nft's minted by candy machine ${candyMachineAddress}`)
  let candyVerifiedListToSign = await getCandyMachineVerifiedMetadata(metadataByCandyMachine, candyMachineAddress, wallet.publicKey.toBase58())
  console.log(`Found ${candyVerifiedListToSign.length} nft's to sign by  ${wallet.publicKey.toBase58()}`)
  await sendSignMetadata(connection, wallet, candyVerifiedListToSign, batchSize)
}

async function getAccountsByCreatorAddress(creatorAddress, connection) {
  let metadataAccounts = await getProgramAccounts(connection, METADATA_PROGRAM_ID, {
    filters: [
      {
        memcmp: {
          offset:
            1 + // key
            32 + // update auth
            32 + // mint
            4 + // name string length
            MAX_NAME_LENGTH + // name
            4 + // uri string length
            MAX_URI_LENGTH + // uri*
            4 + // symbol string length
            MAX_SYMBOL_LENGTH + // symbol
            2 + // seller fee basis points
            1 + // whether or not there is a creators vec
            4 + // creators vec length
            0 * MAX_CREATOR_LEN,
          bytes: creatorAddress,
        },
      },
    ],
  })
  let decodedAccounts = []
  for (let i = 0; i < metadataAccounts.length; i++) {
    let e = metadataAccounts[i];
    let decoded = await decodeMetadata(e.account.data)
    let accountPubkey = e.pubkey
    let store = [decoded, accountPubkey]
    decodedAccounts.push(store)
  }
  return decodedAccounts
}

async function getCandyMachineVerifiedMetadata(metadataList, candyAddress, creatorAddress){
  let verifiedList = [];
  metadataList.forEach(meta => {
    let verifiedCandy = false;
    let verifiedCreator = true;
    meta[0].data.creators.forEach(creator => {
      if (new PublicKey(creator.address).toBase58() == candyAddress && creator.verified === 1) {
        verifiedCandy = true;
      }
      if (new PublicKey(creator.address).toBase58() == creatorAddress && creator.verified === 0) {
        verifiedCreator = false;
      }
    });
    if(verifiedCandy && !verifiedCreator){
      verifiedList.push(meta)
    }
  });
  return verifiedList
}

async function sendSignMetadata(
  connection,
  wallet,
  metadataList,
  batchsize
) {
  let total = 0;
  while(metadataList.length > 0){
    console.log("Signing metadata")
    let sliceAmount = batchsize;
    if (metadataList.length < batchsize) {
      sliceAmount = metadataList.length;
    }
    var removed = metadataList.splice(0,sliceAmount);
    total += sliceAmount;
    await delay(500)
    await signMetadataBatch(removed, connection, wallet)
    console.log(`Processed ${total} nfts`)
  }
  console.log("Finished signing metadata..")
}

async function signMetadataBatch(metadataList, connection, keypair){
  
  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  for (let i = 0; i < metadataList.length; i++) {
    const meta = metadataList[i];
    await signMetadataSingle(meta[1], keypair.publicKey.toBase58(), instructions)
  }
  await sendTransactionWithRetryWithKeypair(connection, keypair, instructions, [], 'single')
}

async function signMetadataSingle(
  metadata,
  creator,
  instructions,
) {
  const metadataProgramId = new PublicKey(METADATA_PROGRAM_ID)
  const data = Buffer.from([7]);
  const keys = [
    {
      pubkey: new PublicKey(metadata),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: new PublicKey(creator),
      isSigner: true,
      isWritable: false,
    },
  ];
  instructions.push(
    ({
      keys,
      programId: METADATA_PROGRAM_ID,
      data,
    }),
  );
}

function delay(ms: number) {
  return new Promise( resolve => setTimeout(resolve, ms) );
}
