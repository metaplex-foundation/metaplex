import {
  Keypair,
  PublicKey,
  SystemProgram,
  AccountInfo,
} from '@solana/web3.js';
import {
  CANDY_MACHINE,
  CANDY_MACHINE_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  FAIR_LAUNCH_PROGRAM_ID,
  AUCTION_HOUSE_PROGRAM_ID,
  AUCTION_HOUSE,
  FEE_PAYER,
  TREASURY,
  WRAPPED_SOL_MINT,
  TOKEN_ENTANGLEMENT_PROGRAM_ID,
  TOKEN_ENTANGLER,
  ESCROW,
  B,
  A,
  CANDY_MACHINE_PROGRAM_V2_ID,
} from './constants';
import * as anchor from '@project-serum/anchor';
import fs from 'fs';
import { createCandyMachineV2Account } from './instructions';
import { web3 } from '@project-serum/anchor';
import log from 'loglevel';
import { AccountLayout, u64 } from '@solana/spl-token';
import { getCluster } from './various';
export type AccountAndPubkey = {
  pubkey: string;
  account: AccountInfo<Buffer>;
};

// TODO: expose in spl package
export const deserializeAccount = (data: Buffer) => {
  const accountInfo = AccountLayout.decode(data);
  accountInfo.mint = new PublicKey(accountInfo.mint);
  accountInfo.owner = new PublicKey(accountInfo.owner);
  accountInfo.amount = u64.fromBuffer(accountInfo.amount);

  if (accountInfo.delegateOption === 0) {
    accountInfo.delegate = null;
    accountInfo.delegatedAmount = new u64(0);
  } else {
    accountInfo.delegate = new PublicKey(accountInfo.delegate);
    accountInfo.delegatedAmount = u64.fromBuffer(accountInfo.delegatedAmount);
  }

  accountInfo.isInitialized = accountInfo.state !== 0;
  accountInfo.isFrozen = accountInfo.state === 2;

  if (accountInfo.isNativeOption === 1) {
    accountInfo.rentExemptReserve = u64.fromBuffer(accountInfo.isNative);
    accountInfo.isNative = true;
  } else {
    accountInfo.rentExemptReserve = null;
    accountInfo.isNative = false;
  }

  if (accountInfo.closeAuthorityOption === 0) {
    accountInfo.closeAuthority = null;
  } else {
    accountInfo.closeAuthority = new PublicKey(accountInfo.closeAuthority);
  }

  return accountInfo;
};

export interface WhitelistMintMode {
  neverBurn: undefined | boolean;
  burnEveryTime: undefined | boolean;
}

export interface CandyMachine {
  authority: anchor.web3.PublicKey;
  wallet: anchor.web3.PublicKey;
  tokenMint: null | anchor.web3.PublicKey;
  itemsRedeemed: anchor.BN;
  data: CandyMachineData;
}
export interface CandyMachineData {
  itemsAvailable: anchor.BN;
  uuid: null | string;
  symbol: string;
  sellerFeeBasisPoints: number;
  isMutable: boolean;
  maxSupply: anchor.BN;
  price: anchor.BN;
  retainAuthority: boolean;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
  };
  goLiveDate: null | anchor.BN;
  endSettings: null | [number, anchor.BN];
  whitelistMintSettings: null | {
    mode: WhitelistMintMode;
    mint: anchor.web3.PublicKey;
    presale: boolean;
    discountPrice: null | anchor.BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  creators: {
    address: PublicKey;
    verified: boolean;
    share: number;
  }[];
}

export const createCandyMachineV2 = async function (
  anchorProgram: anchor.Program,
  payerWallet: Keypair,
  treasuryWallet: PublicKey,
  splToken: PublicKey,
  candyData: CandyMachineData,
) {
  const candyAccount = Keypair.generate();
  candyData.uuid = uuidFromConfigPubkey(candyAccount.publicKey);

  if (!candyData.symbol) {
    throw new Error(`Invalid config, there must be a symbol.`);
  }

  if (!candyData.creators || candyData.creators.length === 0) {
    throw new Error(`Invalid config, there must be at least one creator.`);
  }

  const totalShare = (candyData.creators || []).reduce(
    (acc, curr) => acc + curr.share,
    0,
  );

  if (totalShare !== 100) {
    throw new Error(`Invalid config, creators shares must add up to 100`);
  }

  const remainingAccounts = [];
  if (splToken) {
    remainingAccounts.push({
      pubkey: splToken,
      isSigner: false,
      isWritable: false,
    });
  }
  return {
    candyMachine: candyAccount.publicKey,
    uuid: candyData.uuid,
    txId: await anchorProgram.rpc.initializeCandyMachine(candyData, {
      accounts: {
        candyMachine: candyAccount.publicKey,
        wallet: treasuryWallet,
        authority: payerWallet.publicKey,
        payer: payerWallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [payerWallet, candyAccount],
      remainingAccounts:
        remainingAccounts.length > 0 ? remainingAccounts : undefined,
      instructions: [
        await createCandyMachineV2Account(
          anchorProgram,
          candyData,
          payerWallet.publicKey,
          candyAccount.publicKey,
        ),
      ],
    }),
  };
};

export function uuidFromConfigPubkey(configAccount: PublicKey) {
  return configAccount.toBase58().slice(0, 6);
}

export const getTokenWallet = async function (
  wallet: PublicKey,
  mint: PublicKey,
) {
  return (
    await PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    )
  )[0];
};

export const getCandyMachineAddress = async (
  config: anchor.web3.PublicKey,
  uuid: string,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_PROGRAM_ID,
  );
};

export const deriveCandyMachineV2ProgramAddress = async (
  candyMachineId: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), candyMachineId.toBuffer()],
    CANDY_MACHINE_PROGRAM_V2_ID,
  );
};

export const getTokenMint = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunch = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer()],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getCandyMachineCreator = async (
  candyMachine: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('candy_machine'), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM_V2_ID,
  );
};

export const getFairLaunchTicket = async (
  tokenMint: anchor.web3.PublicKey,
  buyer: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), buyer.toBuffer()],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunchLotteryBitmap = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('lottery')],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getFairLaunchTicketSeqLookup = async (
  tokenMint: anchor.web3.PublicKey,
  seq: anchor.BN,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), seq.toBuffer('le', 8)],
    FAIR_LAUNCH_PROGRAM_ID,
  );
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

export const getParticipationMint = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
      Buffer.from('participation'),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getParticipationToken = async (
  authority: anchor.web3.PublicKey,
  uuid: string,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('fair_launch'),
      authority.toBuffer(),
      Buffer.from('mint'),
      Buffer.from(uuid),
      Buffer.from('participation'),
      Buffer.from('account'),
    ],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getTreasury = async (
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('fair_launch'), tokenMint.toBuffer(), Buffer.from('treasury')],
    FAIR_LAUNCH_PROGRAM_ID,
  );
};

export const getMetadata = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getCollectionPDA = async (
  candyMachineAddress: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from('collection'), candyMachineAddress.toBuffer()],
    CANDY_MACHINE_PROGRAM_V2_ID,
  );
};

export const getCollectionAuthorityRecordPDA = async (
  mint: anchor.web3.PublicKey,
  newAuthority: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('collection_authority'),
      newAuthority.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
};

export const getMasterEdition = async (
  mint: anchor.web3.PublicKey,
): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getEditionMarkPda = async (
  mint: anchor.web3.PublicKey,
  edition: number,
): Promise<anchor.web3.PublicKey> => {
  const editionNumber = Math.floor(edition / 248);
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
        Buffer.from(editionNumber.toString()),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getAuctionHouse = async (
  creator: anchor.web3.PublicKey,
  treasuryMint: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(AUCTION_HOUSE), creator.toBuffer(), treasuryMint.toBuffer()],
    AUCTION_HOUSE_PROGRAM_ID,
  );
};

export const getAuctionHouseProgramAsSigner = async (): Promise<
  [PublicKey, number]
> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(AUCTION_HOUSE), Buffer.from('signer')],
    AUCTION_HOUSE_PROGRAM_ID,
  );
};

export const getAuctionHouseFeeAcct = async (
  auctionHouse: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(AUCTION_HOUSE),
      auctionHouse.toBuffer(),
      Buffer.from(FEE_PAYER),
    ],
    AUCTION_HOUSE_PROGRAM_ID,
  );
};

export const getAuctionHouseTreasuryAcct = async (
  auctionHouse: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(AUCTION_HOUSE),
      auctionHouse.toBuffer(),
      Buffer.from(TREASURY),
    ],
    AUCTION_HOUSE_PROGRAM_ID,
  );
};

export const getAuctionHouseBuyerEscrow = async (
  auctionHouse: anchor.web3.PublicKey,
  wallet: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(AUCTION_HOUSE), auctionHouse.toBuffer(), wallet.toBuffer()],
    AUCTION_HOUSE_PROGRAM_ID,
  );
};

export const getAuctionHouseTradeState = async (
  auctionHouse: anchor.web3.PublicKey,
  wallet: anchor.web3.PublicKey,
  tokenAccount: anchor.web3.PublicKey,
  treasuryMint: anchor.web3.PublicKey,
  tokenMint: anchor.web3.PublicKey,
  tokenSize: anchor.BN,
  buyPrice: anchor.BN,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [
      Buffer.from(AUCTION_HOUSE),
      wallet.toBuffer(),
      auctionHouse.toBuffer(),
      tokenAccount.toBuffer(),
      treasuryMint.toBuffer(),
      tokenMint.toBuffer(),
      buyPrice.toBuffer('le', 8),
      tokenSize.toBuffer('le', 8),
    ],
    AUCTION_HOUSE_PROGRAM_ID,
  );
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

export function loadWalletKey(keypair): Keypair {
  if (!keypair || keypair == '') {
    throw new Error('Keypair is required!');
  }
  const loaded = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypair).toString())),
  );
  log.info(`wallet public key: ${loaded.publicKey}`);
  return loaded;
}

export async function loadCandyProgram(
  walletKeyPair: Keypair,
  env: string,
  customRpcUrl?: string,
) {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);

  // @ts-ignore
  const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );

  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(CANDY_MACHINE_PROGRAM_ID, provider);
  const program = new anchor.Program(idl, CANDY_MACHINE_PROGRAM_ID, provider);
  log.debug('program id from anchor', program.programId.toBase58());
  return program;
}

export async function loadCandyProgramV2(
  walletKeyPair: Keypair,
  env: string,
  customRpcUrl?: string,
) {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);

  // @ts-ignore
  const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );

  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(
    CANDY_MACHINE_PROGRAM_V2_ID,
    provider,
  );
  const program = new anchor.Program(
    idl,
    CANDY_MACHINE_PROGRAM_V2_ID,
    provider,
  );
  log.debug('program id from anchor', program.programId.toBase58());
  return program;
}

export async function loadFairLaunchProgram(
  walletKeyPair: Keypair,
  env: string,
  customRpcUrl?: string,
) {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);

  // @ts-ignore
  const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(FAIR_LAUNCH_PROGRAM_ID, provider);

  return new anchor.Program(idl, FAIR_LAUNCH_PROGRAM_ID, provider);
}

export async function loadAuctionHouseProgram(
  walletKeyPair: Keypair,
  env: string,
  customRpcUrl?: string,
) {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);

  // @ts-ignore
  const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(AUCTION_HOUSE_PROGRAM_ID, provider);

  return new anchor.Program(idl, AUCTION_HOUSE_PROGRAM_ID, provider);
}

export async function loadTokenEntanglementProgream(
  walletKeyPair: Keypair,
  env: string,
  customRpcUrl?: string,
) {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);

  // @ts-ignore
  const solConnection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );
  const walletWrapper = new anchor.Wallet(walletKeyPair);
  const provider = new anchor.Provider(solConnection, walletWrapper, {
    preflightCommitment: 'recent',
  });
  const idl = await anchor.Program.fetchIdl(
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
    provider,
  );

  return new anchor.Program(idl, TOKEN_ENTANGLEMENT_PROGRAM_ID, provider);
}

export async function getTokenAmount(
  anchorProgram: anchor.Program,
  account: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
): Promise<number> {
  let amount = 0;
  if (!mint.equals(WRAPPED_SOL_MINT)) {
    try {
      const token =
        await anchorProgram.provider.connection.getTokenAccountBalance(account);
      amount = token.value.uiAmount * Math.pow(10, token.value.decimals);
    } catch (e) {
      log.error(e);
      log.info(
        'Account ',
        account.toBase58(),
        'didnt return value. Assuming 0 tokens.',
      );
    }
  } else {
    amount = await anchorProgram.provider.connection.getBalance(account);
  }
  return amount;
}

export const getBalance = async (
  account: anchor.web3.PublicKey,
  env: string,
  customRpcUrl?: string,
): Promise<number> => {
  if (customRpcUrl) console.log('USING CUSTOM URL', customRpcUrl);
  const connection = new anchor.web3.Connection(
    //@ts-ignore
    customRpcUrl || getCluster(env),
  );
  return await connection.getBalance(account);
};

export async function getProgramAccounts(
  connection: anchor.web3.Connection,
  programId: string,
  configOrCommitment?: any,
): Promise<AccountAndPubkey[]> {
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

  return unsafeResAccounts(unsafeRes.result);
}

function unsafeAccount(account: anchor.web3.AccountInfo<[string, string]>) {
  return {
    // TODO: possible delay parsing could be added here
    data: Buffer.from(account.data[0], 'base64'),
    executable: account.executable,
    lamports: account.lamports,
    // TODO: maybe we can do it in lazy way? or just use string
    owner: account.owner,
  } as anchor.web3.AccountInfo<Buffer>;
}

function unsafeResAccounts(
  data: Array<{
    account: anchor.web3.AccountInfo<[string, string]>;
    pubkey: string;
  }>,
) {
  return data.map(item => ({
    account: unsafeAccount(item.account),
    pubkey: item.pubkey,
  }));
}
