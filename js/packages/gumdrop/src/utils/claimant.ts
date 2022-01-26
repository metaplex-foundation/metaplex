import {
  AccountMeta,
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import { Token } from '@solana/spl-token';
import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@oyster/common';
import { sha256 } from 'js-sha256';
import BN from 'bn.js';
import * as bs58 from 'bs58';

import {
  getCandyConfig,
  getCandyMachineAddress,
  getCandyMachine,
  getCreatorTokenAccount,
  getEdition,
  getEditionMarkerPda,
  getMintInfo,
} from './accounts';
import { CANDY_MACHINE_ID, GUMDROP_DISTRIBUTOR_ID } from './ids';
import { MerkleTree } from './merkleTree';

export type ClaimantInfo = {
  handle: string;
  amount: number;
  edition: number;

  pin: BN;
  url: string;

  seed: PublicKey;
  secret: PublicKey;
};

const csvStringToArray = (strData: any) => {
  const objPattern = new RegExp(
    '(\\,|\\r?\\n|\\r|^)(?:"([^"]*(?:""[^"]*)*)"|([^\\,\\r\\n]*))',
    'gi',
  );
  let arrMatches: RegExpExecArray | null = null;
  const arrData: Array<Array<string>> = [[]];
  while ((arrMatches = objPattern.exec(strData))) {
    if (arrMatches[1].length && arrMatches[1] !== ',') arrData.push([]);
    arrData[arrData.length - 1].push(
      arrMatches[2]
        ? arrMatches[2].replace(new RegExp('""', 'g'), '"')
        : arrMatches[3],
    );
  }
  return arrData;
};

export type Claimants = Array<ClaimantInfo>;
export const parseClaimants = (
  input: string,
  filename: string,
  method: string,
): Claimants => {
  const extension = filename.match(/\.[0-9a-z]+$/i);
  if (extension === null) {
    throw new Error(`Could not parse file extension from ${filename}`);
  }
  switch (extension[0]) {
    case '.csv': {
      const arr = csvStringToArray(input);
      // TODO: more robust
      let search: string;
      if (method === 'aws-sms') {
        search = 'phone number';
      } else if (method === 'aws-email') {
        search = 'email';
      } else {
        throw new Error(`Cannot parse csv for ${method}`);
      }
      const foundIdx = arr[0].findIndex(s => s.includes(search));
      if (foundIdx === -1) throw new Error(`Could not find ${search} index`);

      const numbers = new Set(
        arr
          .slice(1)
          .filter(arr => arr[foundIdx].length > 0)
          .map(arr => arr[foundIdx]),
      );

      return [...numbers].map((n, idx) => {
        return {
          handle: n,
          amount: 1,
          edition: idx,
        } as any;
      });
    }
    case '.json': {
      const json = JSON.parse(input);
      return json.map((obj: any) => {
        return {
          handle: obj.handle,
          amount: obj.amount,
          edition: obj.edition,
          url: obj.url,
        };
      });
    }
    default: {
      throw new Error(`Cannot parse file format ${extension} from ${filename}`);
    }
  }
};

const explorerUrlFor = (env: string, key: string) => {
  return `https://explorer.solana.com/address/${key}?cluster=${env}`;
};

export type ClaimInfo = { [key: string]: any };

export const dropInfoFor = (
  env: string,
  integration: string,
  tokenMint: string,
  candyConfig: string,
  masterMint: string,
) => {
  switch (integration) {
    case 'transfer':
      return { type: 'Token', meta: explorerUrlFor(env, tokenMint) };
    case 'candy':
      return { type: 'Candy', meta: explorerUrlFor(env, candyConfig) };
    case 'edition':
      return { type: 'Edition', meta: explorerUrlFor(env, masterMint) };
    default:
      throw new Error(`Unknown claim integration method ${integration}`);
  }
};

export const validateTransferClaims = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  claimants: Claimants,
  mintStr: string,
): Promise<ClaimInfo> => {
  claimants.forEach((c, idx) => {
    if (!c.handle) throw new Error(`Claimant ${idx} doesn't have handle`);
    if (!c.amount) throw new Error(`Claimant ${idx} doesn't have amount`);
    if (c.amount === 0) throw new Error(`Claimant ${idx} amount is 0`);
  });

  const total = claimants.reduce((acc, c) => acc + c.amount, 0);
  const mint = await getMintInfo(connection, mintStr);
  const source = await getCreatorTokenAccount(
    walletKey,
    connection,
    mint.key,
    total,
  );

  return {
    total: total,
    mint: mint,
    source: source,
  };
};

export const validateCandyClaims = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  claimants: Claimants,
  candyConfig: string,
  candyUuid: string,
): Promise<ClaimInfo> => {
  claimants.forEach((c, idx) => {
    if (!c.handle) throw new Error(`Claimant ${idx} doesn't have handle`);
    if (!c.amount) throw new Error(`Claimant ${idx} doesn't have amount`);
    if (c.amount === 0) throw new Error(`Claimant ${idx} amount is 0`);
  });

  const total = claimants.reduce((acc, c) => acc + c.amount, 0);
  const configKey = await getCandyConfig(connection, candyConfig);
  const [candyMachineKey] = await getCandyMachineAddress(configKey, candyUuid);

  const candyMachine = await getCandyMachine(connection, candyMachineKey);

  const remaining =
    candyMachine.data.itemsAvailable.toNumber() -
    candyMachine.itemsRedeemed.toNumber();
  if (isNaN(remaining)) {
    // TODO: should this have an override?
    throw new Error(
      `Could not calculate how many candy machine items are remaining`,
    );
  }
  if (remaining < total) {
    throw new Error(
      `Distributor is allocated more mints (${total}) ` +
        `than the candy machine has remaining (${remaining})`,
    );
  }
  if (!candyMachine.authority.equals(walletKey)) {
    throw new Error(`Candy machine authority does not match wallet public key`);
  }

  return {
    total: total,
    config: configKey,
    uuid: candyUuid,
    candyMachineKey: candyMachineKey,
  };
};

const getOffsetFromStart = (edition: BN) => {
  return edition.mod(new BN(31 * 8));
};

const getIndex = (offsetFromStart: BN) => {
  return offsetFromStart.div(new BN(8));
};

const getOffsetFromRight = (offsetFromStart: BN) => {
  return new BN(7).sub(offsetFromStart.mod(new BN(8)));
};

const getIndexAndMask = (edition: BN) => {
  const offsetFromStart = getOffsetFromStart(edition);
  return {
    index: getIndex(offsetFromStart).toNumber(),
    mask: new BN(1)
      .shln(getOffsetFromRight(offsetFromStart).toNumber())
      .toNumber(),
  };
};

const editionTaken = (marker: Array<number>, edition: BN): boolean => {
  const m = getIndexAndMask(edition);
  return (marker[m.index] & m.mask) !== 0;
};

const setEditionTaken = (marker: Array<number>, edition: BN) => {
  const m = getIndexAndMask(edition);
  marker[m.index] = marker[m.index] | m.mask;
};

export const validateEditionClaims = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  claimants: Claimants,
  masterMintStr: string,
): Promise<ClaimInfo> => {
  claimants.forEach((c, idx) => {
    if (!c.handle) throw new Error(`Claimant ${idx} doesn't have handle`);
    if (c.amount !== 1) {
      throw new Error(
        `Claimant ${idx} has amount ${c.amount}. Expected 1 for edition gumdrop`,
      );
    }
  });

  const total = claimants.reduce((acc, c) => acc + c.amount, 0);
  const masterMint = await getMintInfo(connection, masterMintStr);
  const masterTokenAccount = await getCreatorTokenAccount(
    walletKey,
    connection,
    masterMint.key,
    1, // just check that the creator has the master mint
  );

  const masterEditionKey = await getEdition(masterMint.key);
  const masterEdition = await connection.getAccountInfo(masterEditionKey);
  if (masterEdition === null) {
    throw new Error(`Could not fetch master edition`);
  }
  console.log('Master edition', masterEdition);

  // maxSupply is an option, 9 bytes, first is 0 means is none
  const currentSupply = new BN(
    masterEdition.data.slice(1, 1 + 8),
    8,
    'le',
  ).toNumber();
  let maxSupply;
  if (masterEdition.data[9] === 0) {
    maxSupply = null;
  } else {
    maxSupply = new BN(
      masterEdition.data.slice(10, 10 + 8),
      8,
      'le',
    ).toNumber();
  }
  console.log('Max supply', maxSupply);
  console.log('Current supply', currentSupply);

  if (maxSupply !== null && maxSupply < total) {
    throw new Error(
      `Distributor is allocated more editions (${total}) ` +
        `than the master has total (${maxSupply})`,
    );
  }

  // Whether an edition has been claimed is a single bit in a paginated account
  // (pda off of master mint). The following code does some sanity checks
  // around max supply and internally whether the distribution list has
  // duplicate editions, and also checks if the editions were already taken on
  // chain.
  //
  // There is a race condition since the authority to mint is still currently
  // the wallet but it seems like a user error to have other editions being
  // minted while a gumdrop is being created
  const editions: { [key: number]: number } = {};
  const editionMarkers: Array<[PublicKey, Array<number>]> = [];
  for (let idx = 0; idx < claimants.length; ++idx) {
    const c = claimants[idx];
    if (c.edition === undefined)
      throw new Error(`Claimant ${idx} doesn't have edition`);
    if (c.edition <= 0) {
      throw new Error(`Claimant ${idx} assigned invalid edition ${c.edition}`);
    }
    if (maxSupply !== null && c.edition > maxSupply) {
      throw new Error(
        `Claimant ${idx} assigned edition ${c.edition} which is beyond the max supply`,
      );
    }
    if (c.edition in editions) {
      throw new Error(
        `Claimant ${idx} and ${
          editions[c.edition]
        } are both assigned to edition ${c.edition}`,
      );
    }
    const edition = new BN(c.edition);
    const markerKey = await getEditionMarkerPda(masterMint.key, edition);
    let markerData = editionMarkers.find(pm => pm[0].equals(markerKey));
    if (markerData === undefined) {
      const markerAcc = await connection.getAccountInfo(markerKey);
      if (markerAcc === null) {
        editionMarkers.push([markerKey, Array<number>(31)]);
      } else {
        editionMarkers.push([markerKey, [...markerAcc.data.slice(1, 32)]]);
      }
      markerData = editionMarkers[editionMarkers.length - 1];
    }

    if (markerData === undefined) {
      throw new Error(
        `Internal Error: Edition marker info still undefined ${c.edition}`,
      );
    }

    if (editionTaken(markerData[1], edition)) {
      throw new Error(
        `Claimant ${idx} is assigned to edition ${c.edition} which is already taken`,
      );
    }

    setEditionTaken(markerData[1], edition);

    editions[c.edition] = idx;
  }

  return {
    total: total,
    masterMint: masterMint,
    masterTokenAccount: masterTokenAccount,
  };
};

export const chunk = (arr: Buffer, len: number): Array<Buffer> => {
  const chunks: Array<Buffer> = [];
  const n = arr.length;
  let i = 0;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
};

export const buildGumdrop = async (
  connection : RPCConnection,
  walletKey : PublicKey,
  commMethod : string,
  claimIntegration : string,
  host : string,
  baseKey : PublicKey,
  temporalSigner : PublicKey,
  claimants : Claimants,
  claimInfo  : ClaimInfo,
  extraParams : Array<string> = [],
) : Promise<Array<TransactionInstruction>> => {

  const needsPin = commMethod !== "wallets";
  const leafs : Array<Buffer> = [];
  for (let idx = 0; idx < claimants.length; ++idx ) {
    const claimant = claimants[idx];
    if (!needsPin) {
      try {
        claimant.secret = new PublicKey(claimant.handle);
      } catch (err) {
        throw new Error(`Invalid claimant wallet handle ${err}`);
      }
    } else {
      const seeds = [
        claimant.seed.toBuffer(),
        ...chunk(Buffer.from(claimant.handle), 32),
        Buffer.from(claimant.pin.toArray('le', 4)),
      ];
      const [claimantPda] = await PublicKey.findProgramAddress(
        seeds.map(s => s.slice(0, 32)),
        GUMDROP_DISTRIBUTOR_ID,
      );
      claimant.secret = claimantPda;
    }
    // TODO: get this clarified with jordan... we can either just assign some
    // range of editions to a user or give them an amount and just keep a
    // counter on the distributor... the latter is much less work but we lose
    // the ability to use gumdrop for auction house winnings and such?
    const extra =
      claimIntegration === 'edition'
        ? [...new BN(claimant.edition).toArray('le', 8)]
        : [];
    leafs.push(
      Buffer.from([
        ...new BN(idx).toArray('le', 8),
        ...claimant.secret.toBuffer(),
        ...claimant.seed.toBuffer(),
        ...new BN(claimant.amount).toArray('le', 8),
        ...extra,
      ]),
    );
  }

  const tree = new MerkleTree(leafs);
  const root = tree.getRoot();

  const [distributor, dbump] = await PublicKey.findProgramAddress(
    [Buffer.from('MerkleDistributor'), baseKey.toBuffer()],
    GUMDROP_DISTRIBUTOR_ID,
  );

  for (let idx = 0; idx < claimants.length; ++idx) {
    const proof = tree.getProof(idx);
    const verified = tree.verifyProof(idx, proof, root);

    if (!verified) {
      throw new Error('Gumdrop merkle tree verification failed');
    }

    const claimant = claimants[idx];
    const params = [
      `distributor=${distributor}`,
      `method=${commMethod}`,
      `handle=${encodeURIComponent(claimant.handle)}`,
      `amount=${claimant.amount}`,
      `index=${idx}`,
      `proof=${proof.map(b => bs58.encode(b))}`,
      ...extraParams,
    ];
    if (needsPin) {
      params.push(`pin=${claimant.pin.toNumber()}`);
    } else {
      params.push(`pin=NA`);
    }
    if (claimIntegration === 'transfer') {
      params.push(`tokenAcc=${claimInfo.source}`);
    } else if (claimIntegration === 'candy') {
      params.push(`config=${claimInfo.config}`);
      params.push(`uuid=${claimInfo.uuid}`);
    } else {
      params.push(`master=${claimInfo.masterMint.key}`);
      params.push(`edition=${claimant.edition}`);
    }
    const query = params.join('&');

    claimant.url = `${host}/claim?${query}`;
  }

  // initial merkle-distributor state
  const instructions = Array<TransactionInstruction>();
  instructions.push(
    new TransactionInstruction({
      programId: GUMDROP_DISTRIBUTOR_ID,
      keys: [
        { pubkey: baseKey, isSigner: true, isWritable: false },
        { pubkey: distributor, isSigner: false, isWritable: true },
        { pubkey: walletKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        ...Buffer.from(sha256.digest('global:new_distributor')).slice(0, 8),
        ...new BN(dbump).toArray('le', 1),
        ...root,
        ...temporalSigner.toBuffer(),
      ]),
    }),
  );

  if (claimIntegration === 'transfer') {
    instructions.push(
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        claimInfo.source,
        distributor,
        walletKey,
        [],
        claimInfo.total,
      ),
    );
  } else if (claimIntegration === 'candy') {
    const [distributorWalletKey] = await PublicKey.findProgramAddress(
      [Buffer.from('Wallet'), distributor.toBuffer()],
      GUMDROP_DISTRIBUTOR_ID,
    );

    instructions.push(
      new TransactionInstruction({
        programId: CANDY_MACHINE_ID,
        keys: [
          {
            pubkey: claimInfo.candyMachineKey,
            isSigner: false,
            isWritable: true,
          },
          { pubkey: walletKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.from([
          ...Buffer.from(sha256.digest('global:update_authority')).slice(0, 8),
          ...new BN(1).toArray('le', 1), // optional exists...
          ...distributorWalletKey.toBuffer(),
        ]),
      }),
    );
  } else if (claimIntegration === 'edition') {
    // transfer master edition to distributor
    const [distributorTokenKey] = await PublicKey.findProgramAddress(
      [
        distributor.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        claimInfo.masterMint.key.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    );

    instructions.push(
      Token.createAssociatedTokenAccountInstruction(
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        claimInfo.masterMint.key,
        distributorTokenKey,
        distributor,
        walletKey,
      ),
    );

    instructions.push(
      Token.createTransferInstruction(
        TOKEN_PROGRAM_ID,
        claimInfo.masterTokenAccount,
        distributorTokenKey,
        walletKey,
        [],
        1,
      ),
    );
  }

  return instructions;
};

export const closeGumdrop = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  base: Keypair,
  claimMethod: string,
  transferMint: string,
  candyConfig: string,
  candyUuid: string,
  masterMint: string,
): Promise<Array<TransactionInstruction>> => {
  const [distributorKey, dbump] = await PublicKey.findProgramAddress(
    [Buffer.from('MerkleDistributor'), base.publicKey.toBuffer()],
    GUMDROP_DISTRIBUTOR_ID,
  );

  const [distributorWalletKey, wbump] = await PublicKey.findProgramAddress(
    [Buffer.from('Wallet'), distributorKey.toBuffer()],
    GUMDROP_DISTRIBUTOR_ID,
  );

  let extraKeys: Array<AccountMeta>;
  const instructions = Array<TransactionInstruction>();

  if (claimMethod === 'transfer') {
    const mint = await getMintInfo(connection, transferMint);
    const source = await getCreatorTokenAccount(
      walletKey,
      connection,
      mint.key,
      0,
    );
    // distributor is about to be closed anyway so this is redundant but...
    instructions.push(
      Token.createRevokeInstruction(TOKEN_PROGRAM_ID, source, walletKey, []),
    );
  }

  if (claimMethod === 'candy') {
    const configKey = await getCandyConfig(connection, candyConfig);
    const [candyMachineKey] = await getCandyMachineAddress(
      configKey,
      candyUuid,
    );

    extraKeys = [
      { pubkey: candyMachineKey, isSigner: false, isWritable: true },
      { pubkey: CANDY_MACHINE_ID, isSigner: false, isWritable: false },
    ];
  } else {
    extraKeys = [];
  }

  if (claimMethod === 'edition') {
    let masterMintKey: PublicKey;
    try {
      masterMintKey = new PublicKey(masterMint);
    } catch (err) {
      throw new Error(`Invalid mint key ${err}`);
    }
    const [distributorTokenKey] = await PublicKey.findProgramAddress(
      [
        distributorKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        masterMintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    );

    const [walletTokenKey] = await PublicKey.findProgramAddress(
      [
        walletKey.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        masterMintKey.toBuffer(),
      ],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    );

    instructions.push(
      new TransactionInstruction({
        programId: GUMDROP_DISTRIBUTOR_ID,
        keys: [
          { pubkey: base.publicKey, isSigner: true, isWritable: false },
          { pubkey: distributorKey, isSigner: false, isWritable: false },
          { pubkey: distributorTokenKey, isSigner: false, isWritable: true },
          { pubkey: walletTokenKey, isSigner: false, isWritable: true },
          { pubkey: walletKey, isSigner: false, isWritable: true },
          {
            pubkey: SystemProgram.programId,
            isSigner: false,
            isWritable: false,
          },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([
          ...Buffer.from(
            sha256.digest('global:close_distributor_token_account'),
          ).slice(0, 8),
          ...new BN(dbump).toArray('le', 1),
        ]),
      }),
    );
  }

  instructions.push(
    new TransactionInstruction({
      programId: GUMDROP_DISTRIBUTOR_ID,
      keys: [
        { pubkey: base.publicKey, isSigner: true, isWritable: false },
        { pubkey: distributorKey, isSigner: false, isWritable: true },
        { pubkey: distributorWalletKey, isSigner: false, isWritable: true },
        { pubkey: walletKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ...extraKeys,
      ],
      data: Buffer.from([
        ...Buffer.from(sha256.digest('global:close_distributor')).slice(0, 8),
        ...new BN(dbump).toArray('le', 1),
        ...new BN(wbump).toArray('le', 1),
      ]),
    }),
  );

  return instructions;
};
