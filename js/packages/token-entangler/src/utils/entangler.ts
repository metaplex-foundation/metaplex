import {
  AccountInfo,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';

import { Connection as ContextConnection } from '../contexts';
import { deserializeUnchecked } from 'borsh';
import * as anchor from '@project-serum/anchor';
import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_ENTANGLEMENT_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from './ids';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BN } from '@project-serum/anchor';
import { getEdition, getMetadata, getTokenAmount } from './accounts';
import mints from './valid_mints.json';
import { extendBorsh } from './borsh';
export const TOKEN_ENTANGLER = 'token_entangler';
export const ESCROW = 'escrow';
export const A = 'A';
export const B = 'B';

export class Creator {
  address: PublicKey;
  verified: number;
  share: number;

  constructor(args: { address: PublicKey; verified: number; share: number }) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
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

export enum MetadataKey {
  Uninitialized = 0,
  MetadataV1 = 4,
  EditionV1 = 1,
  MasterEditionV1 = 2,
  MasterEditionV2 = 6,
  EditionMarker = 7,
}
export class Metadata {
  key: MetadataKey;
  updateAuthority: PublicKey;
  mint: PublicKey;
  data: Data;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce: number | null;
  imageUrl: string | null;

  // set lazy
  masterEdition?: PublicKey;
  edition?: PublicKey;

  constructor(args: {
    updateAuthority: PublicKey;
    mint: PublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;
    imageUrl: string | null;
  }) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
    this.imageUrl = null;
    this.editionNonce = args.editionNonce ?? null;
  }
}

export const METADATA_SCHEMA = new Map<any, any>([
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
        ['address', 'pubkey'],
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
        ['updateAuthority', 'pubkey'],
        ['mint', 'pubkey'],
        ['data', Data],
        ['primarySaleHappened', 'u8'], // bool
        ['isMutable', 'u8'], // bool
        ['editionNonce', { kind: 'option', type: 'u8' }],
      ],
    },
  ],
]);

extendBorsh();

// eslint-disable-next-line no-control-regex
const METADATA_REPLACE = new RegExp('\u0000', 'g');

export const decodeMetadata = (buffer: Buffer): Metadata => {
  const metadata = deserializeUnchecked(
    METADATA_SCHEMA,
    Metadata,
    buffer,
  ) as Metadata;
  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, '');
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, '');
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, '');
  return metadata;
};

export const getTokenEntanglement = async (
  mintA: anchor.web3.PublicKey,
  mintB: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(TOKEN_ENTANGLER), mintA.toBuffer(), mintB.toBuffer()],
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
  );
};

export const getEpKeyFromArgs = async (
  anchorProgram: anchor.Program,
  mintA: PublicKey | null,
  mintB: PublicKey | null,
  entangledPair: string | undefined,
): Promise<PublicKey> => {
  let epKey;
  if (!entangledPair) {
    console.log('No entangled pair detected, generating from mint arguments.');
    if (mintA && mintB) {
      epKey = (await getTokenEntanglement(mintA, mintB))[0];

      const obj = await anchorProgram.provider.connection.getAccountInfo(epKey);
      if (!obj) {
        epKey = (await getTokenEntanglement(mintB, mintA))[0];
      }
    }
  } else {
    epKey = new PublicKey(entangledPair);
  }

  return epKey;
};

export const getPriceWithMantissa = async (
  price: number,
  mint: PublicKey,
  walletKeyPair: any,
  anchorProgram: anchor.Program,
): Promise<number> => {
  const token = new Token(
    anchorProgram.provider.connection,
    new PublicKey(mint),
    TOKEN_PROGRAM_ID,
    walletKeyPair,
  );

  const mintInfo = await token.getMintInfo();

  const mantissa = 10 ** mintInfo.decimals;

  return Math.ceil(price * mantissa);
};

export async function loadTokenEntanglementProgram(
  anchorWallet: anchor.Wallet,
  connection: Connection,
) {
  const provider = new anchor.Provider(connection, anchorWallet, {
    preflightCommitment: 'recent',
  });

  const idl = await anchor.Program.fetchIdl(
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
    provider,
  );
  //@ts-ignore
  return new anchor.Program(idl, TOKEN_ENTANGLEMENT_PROGRAM_ID, provider);
}

export const getTokenEntanglementEscrows = async (
  mintA: anchor.web3.PublicKey,
  mintB: anchor.web3.PublicKey,
): Promise<[PublicKey, number, PublicKey, number]> => {
  return [
    ...(await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(TOKEN_ENTANGLER),
        mintA.toBuffer(),
        mintB.toBuffer(),
        Buffer.from(ESCROW),
        Buffer.from(A),
      ],
      TOKEN_ENTANGLEMENT_PROGRAM_ID,
    )),
    ...(await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from(TOKEN_ENTANGLER),
        mintA.toBuffer(),
        mintB.toBuffer(),
        Buffer.from(ESCROW),
        Buffer.from(B),
      ],
      TOKEN_ENTANGLEMENT_PROGRAM_ID,
    )),
  ];
};

export const getAtaForMint = async (
  mint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );
};

export const showEntanglement = async (
  anchorWallet: anchor.Wallet,
  connection: Connection,
  entangledPair: string | undefined,
  mintA: string | null,
  mintB: string | null,
) => {
  const anchorProgram = await loadTokenEntanglementProgram(
    anchorWallet,
    connection,
  );

  const epKey = await getEpKeyFromArgs(
    anchorProgram,
    mintA ? new PublicKey(mintA) : null,
    mintB ? new PublicKey(mintB) : null,
    entangledPair,
  );
  const epObj = await anchorProgram.account.entangledPair.fetch(epKey);
  console.log('-----');
  console.log('Entangled Pair:', epKey.toBase58());
  //@ts-ignore
  console.log('Mint:', epObj.treasuryMint.toBase58());
  //@ts-ignore
  console.log('Authority:', epObj.authority.toBase58());
  //@ts-ignore
  console.log('Mint A:', epObj.mintA.toBase58());
  //@ts-ignore
  console.log('Mint B:', epObj.mintB.toBase58());
  //@ts-ignore
  console.log('Token A Escrow:', epObj.tokenAEscrow.toBase58());
  //@ts-ignore
  console.log('Token B Escrow:', epObj.tokenBEscrow.toBase58());
  //@ts-ignore
  console.log('Price:', epObj.price.toNumber());
  //@ts-ignore
  console.log('Paid At Least Once:', epObj.paid);
  //@ts-ignore
  console.log('Pays Every Time:', epObj.paysEveryTime);
  //@ts-ignore
  console.log('Bump:', epObj.bump);
  return epObj;
};

export const createEntanglement = async (
  anchorWallet: anchor.Wallet,
  connection: Connection,
  treasuryMint: string | null,
  authority: string | null,
  paysEveryTime: boolean,
  price: string,
  mintA: string,
  mintB: string,
) => {
  const anchorProgram = await loadTokenEntanglementProgram(
    anchorWallet,
    connection,
  );

  const priceNumber = parseFloat(price);

  let authorityKey: PublicKey, tMintKey: PublicKey;
  if (!authority) {
    console.log('No authority detected, using keypair');
    authorityKey = anchorWallet.publicKey;
  } else {
    console.log('Authority detected, loading keypair...');
    authorityKey = new PublicKey(authority);
  }

  const mintAKey = new PublicKey(mintA);
  const mintBKey = new PublicKey(mintB);

  if (!treasuryMint) {
    console.log('No treasury mint detected, using SOL.');
    tMintKey = WRAPPED_SOL_MINT;
  } else {
    tMintKey = new PublicKey(treasuryMint);
  }

  const [entangledPair, bump] = await getTokenEntanglement(mintAKey, mintBKey);

  const [reverseEntangledPair, reverseBump] = await getTokenEntanglement(
    mintBKey,
    mintAKey,
  );

  const [tokenAEscrow, tokenABump, tokenBEscrow, tokenBBump] =
    await getTokenEntanglementEscrows(mintAKey, mintBKey);
  const priceAdjusted = new BN(
    await getPriceWithMantissa(
      priceNumber,
      tMintKey,
      anchorWallet,
      anchorProgram,
    ),
  );

  const ata = (await getAtaForMint(mintBKey, anchorWallet.publicKey))[0];
  const transferAuthority = Keypair.generate();
  const signers = [transferAuthority];
  const instruction = await anchorProgram.instruction.createEntangledPair(
    bump,
    reverseBump,
    tokenABump,
    tokenBBump,
    priceAdjusted,
    paysEveryTime,
    {
      accounts: {
        treasuryMint: tMintKey,
        payer: anchorWallet.publicKey,
        transferAuthority: transferAuthority.publicKey,
        authority: authorityKey,
        mintA: mintAKey,
        metadataA: await getMetadata(mintAKey),
        editionA: await getEdition(mintAKey),
        mintB: mintBKey,
        metadataB: await getMetadata(mintBKey),
        editionB: await getEdition(mintBKey),
        tokenB: ata,
        tokenAEscrow,
        tokenBEscrow,
        entangledPair,
        reverseEntangledPair,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      },
    },
  );
  const instructions = [
    Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      ata,
      transferAuthority.publicKey,
      anchorWallet.publicKey,
      [],
      1,
    ),
    instruction,
    Token.createRevokeInstruction(
      TOKEN_PROGRAM_ID,
      ata,
      anchorWallet.publicKey,
      [],
    ),
  ];

  const createResult = await ContextConnection.sendTransactionWithRetry(
    connection,
    anchorWallet,
    instructions,
    signers,
    'max',
  );

  console.log('Created entanglement', createResult);
  return createResult;
};

export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

export const swapEntanglement = async (
  anchorWallet: anchor.Wallet,
  connection: Connection,
  mintA: string | null,
  mintB: string | null,
  entangledPair: string | undefined,
) => {
  const anchorProgram = await loadTokenEntanglementProgram(
    anchorWallet,
    connection,
  );

  const epKey = await getEpKeyFromArgs(
    anchorProgram,
    mintA ? new PublicKey(mintA) : null,
    mintB ? new PublicKey(mintB) : null,
    entangledPair,
  );
  const epObj = await anchorProgram.account.entangledPair.fetch(epKey);
  //@ts-ignore
  const mintAKey = epObj.mintA;
  //@ts-ignore
  const mintBKey = epObj.mintB;
  const aAta = (await getAtaForMint(mintAKey, anchorWallet.publicKey))[0];
  const bAta = (await getAtaForMint(mintBKey, anchorWallet.publicKey))[0];
  const currABal = await getTokenAmount(anchorProgram, aAta, mintAKey);
  const token = currABal === 1 ? aAta : bAta,
    replacementToken = currABal === 1 ? bAta : aAta;
  const tokenMint = currABal === 1 ? mintAKey : mintBKey,
    replacementTokenMint = currABal === 1 ? mintBKey : mintAKey;
  const result = await getTokenEntanglementEscrows(mintAKey, mintBKey);

  const tokenAEscrow = result[0];
  const tokenBEscrow = result[2];
  const transferAuthority = Keypair.generate();
  const paymentTransferAuthority = Keypair.generate();
  const replacementTokenMetadata = await getMetadata(replacementTokenMint);
  const signers = [transferAuthority];

  //@ts-ignore
  const isNative = epObj.treasuryMint.equals(WRAPPED_SOL_MINT);

  //@ts-ignore
  const paymentAccount = isNative
    ? anchorWallet.publicKey
    : //@ts-ignore
      (await getAtaForMint(epObj.treasuryMint, anchorWallet.publicKey))[0];

  if (!isNative) signers.push(paymentTransferAuthority);
  const remainingAccounts = [];

  const metadataObj = await anchorProgram.provider.connection.getAccountInfo(
    replacementTokenMetadata,
  );
  const metadataDecoded: Metadata = decodeMetadata(
    //@ts-ignore
    Buffer.from(metadataObj.data),
  );
  //@ts-ignore
  for (let i = 0; i < metadataDecoded.data.creators.length; i++) {
    remainingAccounts.push({
      //@ts-ignore
      pubkey: new PublicKey(metadataDecoded.data.creators[i].address),
      //@ts-ignore
      isWritable: true,
      //@ts-ignore
      isSigner: false,
    });
    if (!isNative) {
      remainingAccounts.push({
        //@ts-ignore
        pubkey: (
          await getAtaForMint(
            //@ts-ignore
            epObj.treasuryMint,
            //@ts-ignore
            remainingAccounts[remainingAccounts.length - 1].pubkey,
          )
        )[0],
        //@ts-ignore
        isWritable: true,
        //@ts-ignore
        isSigner: false,
      });
    }
  }
  const instruction = await anchorProgram.instruction.swap({
    accounts: {
      //@ts-ignore
      treasuryMint: epObj.treasuryMint,
      payer: anchorWallet.publicKey,
      paymentAccount,
      transferAuthority: transferAuthority.publicKey,
      paymentTransferAuthority: paymentTransferAuthority.publicKey,
      token,
      replacementTokenMetadata,
      replacementToken,
      replacementTokenMint,
      tokenAEscrow,
      tokenBEscrow,
      entangledPair: epKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    },
    remainingAccounts,
  });

  if (!isNative) {
    instruction.keys
      .filter(k => k.pubkey.equals(paymentTransferAuthority.publicKey))
      .map(k => (k.isSigner = true));
  }

  const instructions = [
    Token.createApproveInstruction(
      TOKEN_PROGRAM_ID,
      token,
      transferAuthority.publicKey,
      anchorWallet.publicKey,
      [],
      1,
    ),
    ...(!isNative
      ? [
          Token.createApproveInstruction(
            TOKEN_PROGRAM_ID,
            paymentAccount,
            paymentTransferAuthority.publicKey,
            anchorWallet.publicKey,
            [],
            //@ts-ignore
            epObj.price.toNumber(),
          ),
        ]
      : []),
    instruction,
    Token.createRevokeInstruction(
      TOKEN_PROGRAM_ID,
      token,
      anchorWallet.publicKey,
      [],
    ),
    ...(!isNative
      ? [
          Token.createRevokeInstruction(
            TOKEN_PROGRAM_ID,
            paymentAccount,
            anchorWallet.publicKey,
            [],
          ),
        ]
      : []),
  ];
  const txnResult = await ContextConnection.sendTransactionWithRetry(
    anchorProgram.provider.connection,
    anchorWallet,
    instructions,
    signers,
    'max',
  );

  console.log(
    'Swapped',
    tokenMint.toBase58(),
    'mint for',
    replacementTokenMint.toBase58(),
    ' with entangled pair ',
    epKey.toBase58(),
  );
  return { txnResult, epkey: epKey.toBase58() };
};

export const searchEntanglements = async (
  anchorWallet: anchor.Wallet,
  connection: Connection,
  mint: string,
  authority: string,
) => {
  const anchorProgram = await loadTokenEntanglementProgram(
    anchorWallet,
    connection,
  );

  const searchMint = new PublicKey(mint);
  const searchAuthority = new PublicKey(authority);

  const searchMintAAccounts =
    await anchorProgram.provider.connection.getProgramAccounts(
      TOKEN_ENTANGLEMENT_PROGRAM_ID,
      {
        filters: [
          // Filter for MintA
          {
            memcmp: {
              offset: 32 + 8,
              bytes: searchMint.toString(),
            },
          },
          {
            memcmp: {
              offset: 8 + 160,
              bytes: searchAuthority.toString(),
            },
          },
        ],
      },
    );
  const searchMintBAccounts =
    await anchorProgram.provider.connection.getProgramAccounts(
      TOKEN_ENTANGLEMENT_PROGRAM_ID,
      {
        filters: [
          // Filter for MintB
          {
            memcmp: {
              offset: 64 + 8,
              bytes: searchMint.toString(),
            },
          },
          {
            memcmp: {
              offset: 8 + 160,
              bytes: searchAuthority.toString(),
            },
          },
        ],
      },
    );

  const entanglementsAccounts = [
    ...searchMintAAccounts,
    ...searchMintBAccounts,
  ];

  let entanglements: any[] = [];
  await Promise.all(
    chunks(Array.from(Array(entanglementsAccounts.length).keys()), 100).map(
      async allIndexesInSlice => {
        const entanglementData = await getMultipleAccounts(
          anchorProgram.provider.connection,
          allIndexesInSlice.map(e =>
            entanglementsAccounts[e].pubkey.toBase58(),
          ),
          'single',
        );
        const decodedEntanglementData = entanglementData.array.map(a =>
          anchorProgram.account.entangledPair.coder.accounts.decode(
            'EntangledPair',
            a.data,
          ),
        );
        entanglements = entanglements.concat(decodedEntanglementData);
      },
    ),
  );
  const reducedEntanglements = entanglements.filter(
    en =>
      //@ts-ignore
      mints.includes(en.mintA.toBase58()) &&
      //@ts-ignore
      mints.includes(en.mintB.toBase58()),
  );

  let metadata: Metadata[] = [];
  await Promise.all(
    chunks(Array.from(Array(reducedEntanglements.length).keys()), 100).map(
      async allIndexesInSlice => {
        const metadataAKey: PublicKey[] = [];
        const metadataBKey: PublicKey[] = [];
        for (let i = 0; i < allIndexesInSlice.length; i++) {
          metadataAKey.push(
            await getMetadata(reducedEntanglements[allIndexesInSlice[i]].mintA),
          );
          metadataBKey.push(
            await getMetadata(reducedEntanglements[allIndexesInSlice[i]].mintB),
          );
        }
        const metadatasA = await getMultipleAccounts(
          anchorProgram.provider.connection,
          metadataAKey.map(a => a.toBase58()),
          'single',
        );
        const metadatasB = await getMultipleAccounts(
          anchorProgram.provider.connection,
          metadataBKey.map(a => a.toBase58()),
          'single',
        );
        const decodedMetadata = [
          ...metadatasA.array.map(a => decodeMetadata(a.data)),
          ...metadatasB.array.map(a => decodeMetadata(a.data)),
        ];
        await Promise.all(
          chunks(Array.from(Array(decodedMetadata.length).keys()), 10).map(
            async allIndexesInSlice => {
              for (let j = 0; j < allIndexesInSlice.length; j++) {
                const json = await fetch(
                  decodedMetadata[allIndexesInSlice[j]].data.uri,
                );
                const decoded = JSON.parse(await json.text());
                decodedMetadata[allIndexesInSlice[j]].imageUrl = decoded.image;
              }
            },
          ),
        );
        metadata = metadata.concat(decodedMetadata);
      },
    ),
  );

  // console.log('Found', mint, entanglements.length, 'entanglements');
  return { entanglements: reducedEntanglements, metadata };
};

export const getMultipleAccounts = async (
  connection: any,
  keys: string[],
  commitment: string,
) => {
  const result = await Promise.all(
    chunks(keys, 99).map(chunk =>
      getMultipleAccountsCore(connection, chunk, commitment),
    ),
  );

  const array = result
    .map(
      a =>
        //@ts-ignore
        a.array.map(acc => {
          if (!acc) {
            return undefined;
          }

          const { data, ...rest } = acc;
          const obj = {
            ...rest,
            data: Buffer.from(data[0], 'base64'),
          } as AccountInfo<Buffer>;
          return obj;
        }) as AccountInfo<Buffer>[],
    )
    //@ts-ignore
    .flat();
  return { keys, array };
};

const getMultipleAccountsCore = async (
  connection: any,
  keys: string[],
  commitment: string,
) => {
  const args = connection._buildArgs([keys], commitment, 'base64');

  const unsafeRes = await connection._rpcRequest('getMultipleAccounts', args);
  if (unsafeRes.error) {
    throw new Error(
      'failed to get info about account ' + unsafeRes.error.message,
    );
  }

  if (unsafeRes.result.value) {
    const array = unsafeRes.result.value as AccountInfo<string[]>[];
    return { keys, array };
  }

  // TODO: fix
  throw new Error();
};

export const getOwnedNFTMints = async (
  anchorWallet: anchor.Wallet,
  connection: Connection,
) => {
  const anchorProgram = await loadTokenEntanglementProgram(
    anchorWallet,
    connection,
  );

  const TokenAccounts =
    await anchorProgram.provider.connection.getParsedTokenAccountsByOwner(
      anchorWallet.publicKey,
      { programId: TOKEN_PROGRAM_ID },
    );
  const NFTMints = TokenAccounts.value
    .map(val => val.account.data.parsed)
    .filter(
      val =>
        val.info.tokenAmount.amount !== 0 &&
        val.info.tokenAmount.decimals === 0 &&
        //@ts-ignore
        mints.includes(val.info.mint),
    );

  return NFTMints;
};
