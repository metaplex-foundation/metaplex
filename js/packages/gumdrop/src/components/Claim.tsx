import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import queryString from 'query-string';

import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Link as HyperLink,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
} from '@mui/material';

import { useWallet } from '@solana/wallet-adapter-react';
import {
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  AccountLayout,
  MintLayout,
  Token,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { notify } from '@oyster/common';
import { sha256 } from 'js-sha256';
import BN from 'bn.js';
import * as bs58 from 'bs58';

import { useConnection } from '../contexts';
import {
  CANDY_MACHINE_ID,
  GUMDROP_DISTRIBUTOR_ID,
  GUMDROP_TEMPORAL_SIGNER,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from '../utils/ids';
import {
  getCandyMachine,
  getCandyMachineAddress,
  getEdition,
  getEditionMarkerPda,
  getMetadata,
} from '../utils/accounts';
import { MerkleTree } from '../utils/merkleTree';
import { explorerLinkFor, sendSignedTransaction } from '../utils/transactions';
import { chunk } from '../utils/claimant';
import { coder } from '../utils/merkleDistributor';

const walletKeyOrPda = async (
  walletKey: PublicKey,
  handle: string,
  pin: BN | null,
  seed: PublicKey,
): Promise<[PublicKey, Array<Buffer>]> => {
  if (pin === null) {
    try {
      const key = new PublicKey(handle);
      if (!key.equals(walletKey)) {
        throw new Error(
          'Claimant wallet handle does not match connected wallet',
        );
      }
      return [key, []];
    } catch (err) {
      throw new Error(`Invalid claimant wallet handle ${err}`);
    }
  } else {
    const seeds = [
      seed.toBuffer(),
      Buffer.from(handle),
      Buffer.from(pin.toArray('le', 4)),
    ];

    const [claimantPda] = await PublicKey.findProgramAddress(
      [seeds[0], ...chunk(seeds[1], 32), seeds[2]],
      GUMDROP_DISTRIBUTOR_ID,
    );
    return [claimantPda, seeds];
  }
};

const buildMintClaim = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorInfo: any,
  tokenAcc: string,
  proof: Array<Buffer>,
  handle: string,
  amount: number,
  index: number,
  pin: BN | null,
): Promise<[Array<TransactionInstruction>, Array<Buffer>, Array<Keypair>]> => {
  let tokenAccKey: PublicKey;
  try {
    tokenAccKey = new PublicKey(tokenAcc);
  } catch (err) {
    throw new Error(`Invalid tokenAcc key ${err}`);
  }
  const distTokenAccount = await connection.getAccountInfo(tokenAccKey);
  if (distTokenAccount === null) {
    throw new Error(`Could not fetch distributor token account`);
  }

  const tokenAccountInfo = AccountLayout.decode(distTokenAccount.data);
  const mint = new PublicKey(tokenAccountInfo.mint);

  console.log(mint.toBase58());

  const [secret, pdaSeeds] = await walletKeyOrPda(walletKey, handle, pin, mint);

  // TODO: since it's in the PDA do we need it to be in the leaf?
  const leaf = Buffer.from([
    ...new BN(index).toArray('le', 8),
    ...secret.toBuffer(),
    ...mint.toBuffer(),
    ...new BN(amount).toArray('le', 8),
  ]);

  const matches = MerkleTree.verifyClaim(
    leaf,
    proof,
    Buffer.from(distributorInfo.root),
  );

  if (!matches) {
    throw new Error('Gumdrop merkle proof does not match');
  }

  const [claimStatus, cbump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('ClaimStatus'),
      Buffer.from(new BN(index).toArray('le', 8)),
      distributorKey.toBuffer(),
    ],
    GUMDROP_DISTRIBUTOR_ID,
  );

  const [walletTokenKey] = await PublicKey.findProgramAddress(
    [walletKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );

  const setup: Array<TransactionInstruction> = [];

  if ((await connection.getAccountInfo(walletTokenKey)) === null) {
    setup.push(
      Token.createAssociatedTokenAccountInstruction(
        SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
        TOKEN_PROGRAM_ID,
        mint,
        walletTokenKey,
        walletKey,
        walletKey,
      ),
    );
  }

  const temporalSigner =
    distributorInfo.temporal.equals(PublicKey.default) ||
    secret.equals(walletKey)
      ? walletKey
      : distributorInfo.temporal;

  const claimAirdrop = new TransactionInstruction({
    programId: GUMDROP_DISTRIBUTOR_ID,
    keys: [
      { pubkey: distributorKey, isSigner: false, isWritable: true },
      { pubkey: claimStatus, isSigner: false, isWritable: true },
      { pubkey: tokenAccKey, isSigner: false, isWritable: true },
      { pubkey: walletTokenKey, isSigner: false, isWritable: true },
      { pubkey: temporalSigner, isSigner: true, isWritable: false },
      { pubkey: walletKey, isSigner: true, isWritable: false }, // payer
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([
      ...Buffer.from(sha256.digest('global:claim')).slice(0, 8),
      ...new BN(cbump).toArray('le', 1),
      ...new BN(index).toArray('le', 8),
      ...new BN(amount).toArray('le', 8),
      ...secret.toBuffer(),
      ...new BN(proof.length).toArray('le', 4),
      ...Buffer.concat(proof),
    ]),
  });

  return [[...setup, claimAirdrop], pdaSeeds, []];
};

const buildCandyClaim = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorInfo: any,
  candyConfig: string,
  candyUUID: string,
  proof: Array<Buffer>,
  handle: string,
  amount: number,
  index: number,
  pin: BN | null,
): Promise<[Array<TransactionInstruction>, Array<Buffer>, Array<Keypair>]> => {
  let configKey: PublicKey;
  try {
    configKey = new PublicKey(candyConfig);
  } catch (err) {
    throw new Error(`Invalid candy config key ${err}`);
  }

  const [secret, pdaSeeds] = await walletKeyOrPda(
    walletKey,
    handle,
    pin,
    configKey,
  );

  // TODO: since it's in the PDA do we need it to be in the leaf?
  const leaf = Buffer.from([
    ...new BN(index).toArray('le', 8),
    ...secret.toBuffer(),
    ...configKey.toBuffer(),
    ...new BN(amount).toArray('le', 8),
  ]);

  const matches = MerkleTree.verifyClaim(
    leaf,
    proof,
    Buffer.from(distributorInfo.root),
  );

  if (!matches) {
    throw new Error('Gumdrop merkle proof does not match');
  }

  const [claimCount, cbump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('ClaimCount'),
      Buffer.from(new BN(index).toArray('le', 8)),
      distributorKey.toBuffer(),
    ],
    GUMDROP_DISTRIBUTOR_ID,
  );

  const [distributorWalletKey, wbump] = await PublicKey.findProgramAddress(
    [Buffer.from('Wallet'), distributorKey.toBuffer()],
    GUMDROP_DISTRIBUTOR_ID,
  );

  // atm the contract has a special case for when the temporal key is defaulted
  // (aka always passes temporal check)
  // TODO: more flexible
  let temporalSigner =
    distributorInfo.temporal.equals(PublicKey.default) ||
    secret.equals(walletKey)
      ? walletKey
      : distributorInfo.temporal;

  const setup: Array<TransactionInstruction> = [];

  const claimCountAccount = await connection.getAccountInfo(claimCount);
  let nftsAlreadyMinted = 0;
  if (claimCountAccount === null) {
    // nothing claimed yet
  } else {
    // TODO: subtract already minted?...
    const claimAccountInfo = coder.accounts.decode(
      'ClaimCount',
      claimCountAccount.data,
    );
    nftsAlreadyMinted = claimAccountInfo.count;
    if (claimAccountInfo.claimant.equals(walletKey)) {
      // we already proved this claim and verified the OTP once, contract knows
      // that this wallet is OK
      temporalSigner = walletKey;
    } else {
      // need to claim with the first wallet...
      const claimantStr = claimAccountInfo.claimant.toBase58();
      throw new Error(
        `This wallet does not match existing claimant ${claimantStr}`,
      );
    }
  }

  const nftsAvailable = amount;
  if (nftsAlreadyMinted >= nftsAvailable) {
    throw new Error(
      `Cannot mint another NFT. ${nftsAvailable} NFT(s) were originally allocated` +
        (nftsAlreadyMinted > 0
          ? ` and ${nftsAlreadyMinted} NFT(s) were already minted`
          : ''),
    );
  }

  const [candyMachineKey] = await getCandyMachineAddress(configKey, candyUUID);
  const candyMachine = await getCandyMachine(connection, candyMachineKey);
  console.log('Candy Machine', candyMachine);

  const candyMachineMints: Array<Keypair> = [];

  const [instrs, mint] = await buildSingleCandyMint(
    connection,
    walletKey,
    distributorKey,
    distributorWalletKey,
    claimCount,
    temporalSigner,
    configKey,
    candyMachineKey,
    candyMachine.wallet,
    Buffer.from([
      ...new BN(wbump).toArray('le', 1),
      ...new BN(cbump).toArray('le', 1),
      ...new BN(index).toArray('le', 8),
      ...new BN(amount).toArray('le', 8),
      ...secret.toBuffer(),
      ...new BN(proof.length).toArray('le', 4),
      ...Buffer.concat(proof),
    ]),
  );
  candyMachineMints.push(mint);
  setup.push(...instrs);

  return [setup, pdaSeeds, candyMachineMints];
};

const buildSingleCandyMint = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorWalletKey: PublicKey,
  claimCount: PublicKey,
  temporalSigner: PublicKey,
  configKey: PublicKey,
  candyMachineKey: PublicKey,
  candyMachineWallet: PublicKey,
  data: Buffer,
): Promise<[Array<TransactionInstruction>, Keypair]> => {
  const candyMachineMint = Keypair.generate();
  const candyMachineMetadata = await getMetadata(candyMachineMint.publicKey);
  const candyMachineMaster = await getEdition(candyMachineMint.publicKey);

  const setup: Array<TransactionInstruction> = [];
  await createMintAndAccount(
    connection,
    walletKey,
    candyMachineMint.publicKey,
    setup,
  );
  setup.push(
    new TransactionInstruction({
      programId: GUMDROP_DISTRIBUTOR_ID,
      keys: [
        { pubkey: distributorKey, isSigner: false, isWritable: true },
        { pubkey: distributorWalletKey, isSigner: false, isWritable: true },
        { pubkey: claimCount, isSigner: false, isWritable: true },
        { pubkey: temporalSigner, isSigner: true, isWritable: false },
        { pubkey: walletKey, isSigner: true, isWritable: false }, // payer

        { pubkey: configKey, isSigner: false, isWritable: true },
        { pubkey: candyMachineKey, isSigner: false, isWritable: true },
        { pubkey: candyMachineWallet, isSigner: false, isWritable: true },
        {
          pubkey: candyMachineMint.publicKey,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: candyMachineMetadata, isSigner: false, isWritable: true },
        { pubkey: candyMachineMaster, isSigner: false, isWritable: true },

        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: TOKEN_METADATA_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: CANDY_MACHINE_ID, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        ...Buffer.from(sha256.digest('global:claim_candy')).slice(0, 8),
        ...data,
      ]),
    }),
  );

  return [setup, candyMachineMint];
};

const createMintAndAccount = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  mint: PublicKey,
  setup: Array<TransactionInstruction>,
) => {
  const [walletTokenKey] = await PublicKey.findProgramAddress(
    [walletKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );

  setup.push(
    SystemProgram.createAccount({
      fromPubkey: walletKey,
      newAccountPubkey: mint,
      space: MintLayout.span,
      lamports: await connection.getMinimumBalanceForRentExemption(
        MintLayout.span,
      ),
      programId: TOKEN_PROGRAM_ID,
    }),
  );

  setup.push(
    Token.createInitMintInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      0,
      walletKey,
      walletKey,
    ),
  );

  setup.push(
    Token.createAssociatedTokenAccountInstruction(
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint,
      walletTokenKey,
      walletKey,
      walletKey,
    ),
  );

  setup.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      mint,
      walletTokenKey,
      walletKey,
      [],
      1,
    ),
  );
};

const buildEditionClaim = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorInfo: any,
  masterMint: string,
  edition: number,
  proof: Array<Buffer>,
  handle: string,
  amount: number,
  index: number,
  pin: BN | null,
): Promise<[Array<TransactionInstruction>, Array<Buffer>, Array<Keypair>]> => {
  let masterMintKey: PublicKey;
  try {
    masterMintKey = new PublicKey(masterMint);
  } catch (err) {
    throw new Error(`Invalid master mint key ${err}`);
  }

  const [secret, pdaSeeds] = await walletKeyOrPda(
    walletKey,
    handle,
    pin,
    masterMintKey,
  );

  // should we assert that the amount is 1?
  const leaf = Buffer.from([
    ...new BN(index).toArray('le', 8),
    ...secret.toBuffer(),
    ...masterMintKey.toBuffer(),
    ...new BN(amount).toArray('le', 8),
    ...new BN(edition).toArray('le', 8),
  ]);

  const matches = MerkleTree.verifyClaim(
    leaf,
    proof,
    Buffer.from(distributorInfo.root),
  );

  if (!matches) {
    throw new Error('Gumdrop merkle proof does not match');
  }

  const [claimCount, cbump] = await PublicKey.findProgramAddress(
    [
      Buffer.from('ClaimCount'),
      Buffer.from(new BN(index).toArray('le', 8)),
      distributorKey.toBuffer(),
    ],
    GUMDROP_DISTRIBUTOR_ID,
  );

  // atm the contract has a special case for when the temporal key is defaulted
  // (aka always passes temporal check)
  // TODO: more flexible
  const temporalSigner =
    distributorInfo.temporal.equals(PublicKey.default) ||
    secret.equals(walletKey)
      ? walletKey
      : distributorInfo.temporal;

  const claimCountAccount = await connection.getAccountInfo(claimCount);
  if (claimCountAccount !== null) {
    throw new Error(`This edition was already claimed`);
  }

  const setup: Array<TransactionInstruction> = [];

  const newMint = Keypair.generate();
  const newMetadataKey = await getMetadata(newMint.publicKey);
  const masterMetadataKey = await getMetadata(masterMintKey);
  const newEdition = await getEdition(newMint.publicKey);
  const masterEdition = await getEdition(masterMintKey);

  await createMintAndAccount(connection, walletKey, newMint.publicKey, setup);

  const [distributorTokenKey] = await PublicKey.findProgramAddress(
    [
      distributorKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      masterMintKey.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );

  const editionMarkKey = await getEditionMarkerPda(
    masterMintKey,
    new BN(edition),
  );

  setup.push(
    new TransactionInstruction({
      programId: GUMDROP_DISTRIBUTOR_ID,
      keys: [
        { pubkey: distributorKey, isSigner: false, isWritable: true },
        { pubkey: claimCount, isSigner: false, isWritable: true },
        { pubkey: temporalSigner, isSigner: true, isWritable: false },
        { pubkey: walletKey, isSigner: true, isWritable: false }, // payer

        { pubkey: newMetadataKey, isSigner: false, isWritable: true },
        { pubkey: newEdition, isSigner: false, isWritable: true },
        { pubkey: masterEdition, isSigner: false, isWritable: true },
        { pubkey: newMint.publicKey, isSigner: false, isWritable: true },
        { pubkey: editionMarkKey, isSigner: false, isWritable: true },
        { pubkey: walletKey, isSigner: true, isWritable: false }, // `newMint` auth
        { pubkey: distributorTokenKey, isSigner: false, isWritable: false },
        { pubkey: walletKey, isSigner: false, isWritable: false }, // new update auth
        { pubkey: masterMetadataKey, isSigner: false, isWritable: false },
        { pubkey: masterMintKey, isSigner: false, isWritable: false },

        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: TOKEN_METADATA_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([
        ...Buffer.from(sha256.digest('global:claim_edition')).slice(0, 8),
        ...new BN(cbump).toArray('le', 1),
        ...new BN(index).toArray('le', 8),
        ...new BN(amount).toArray('le', 8),
        ...new BN(edition).toArray('le', 8),
        ...secret.toBuffer(),
        ...new BN(proof.length).toArray('le', 4),
        ...Buffer.concat(proof),
      ]),
    }),
  );

  return [setup, pdaSeeds, [newMint]];
};

const fetchDistributor = async (
  connection: RPCConnection,
  distributorStr: string,
) => {
  let key;
  try {
    key = new PublicKey(distributorStr);
  } catch (err) {
    throw new Error(`Invalid distributor key ${err}`);
  }
  const account = await connection.getAccountInfo(key);
  if (account === null) {
    throw new Error(`Could not fetch distributor ${distributorStr}`);
  }
  if (!account.owner.equals(GUMDROP_DISTRIBUTOR_ID)) {
    const ownerStr = account.owner.toBase58();
    throw new Error(`Invalid distributor owner ${ownerStr}`);
  }
  const info = coder.accounts.decode('MerkleDistributor', account.data);
  return [key, info];
};

const fetchNeedsTemporalSigner = async (
  connection: RPCConnection,
  distributorStr: string,
  indexStr: string,
  claimMethod: string,
) => {
  const [key, info] = await fetchDistributor(connection, distributorStr);
  if (!info.temporal.equals(GUMDROP_TEMPORAL_SIGNER)) {
    // default pubkey or program itself (distribution through wallets)
    return false;
  } else if (claimMethod === 'candy') {
    const [claimCount] = await PublicKey.findProgramAddress(
      [
        Buffer.from('ClaimCount'),
        Buffer.from(new BN(Number(indexStr)).toArray('le', 8)),
        key.toBuffer(),
      ],
      GUMDROP_DISTRIBUTOR_ID,
    );
    // if someone (maybe us) has already claimed this, the contract will
    // not check the existing temporal signer anymore since presumably
    // they have already verified the OTP. So we need to fetch the temporal
    // signer if it is null
    const claimCountAccount = await connection.getAccountInfo(claimCount);
    return claimCountAccount === null;
  } else {
    // default to need one
    return true;
  }
};

export type ClaimProps = {};

type ClaimTransactions = {
  setup: Transaction | null;
  claim: Transaction;
};

export const Claim = (props: RouteComponentProps<ClaimProps>) => {
  const connection = useConnection();
  const wallet = useWallet();

  let query = props.location.search;
  if (query && query.length > 0) {
    localStorage.setItem('claimQuery', query);
  } else {
    const stored = localStorage.getItem('claimQuery');
    if (stored) query = stored;
  }

  const params = queryString.parse(query);
  const [distributor, setDistributor] = React.useState(
    (params.distributor as string) || '',
  );
  const [claimMethod, setClaimMethod] = React.useState(
    params.tokenAcc
      ? 'transfer'
      : params.config
      ? 'candy'
      : params.master
      ? 'edition'
      : '',
  );
  const [tokenAcc, setTokenAcc] = React.useState(
    (params.tokenAcc as string) || '',
  );
  const [candyConfig, setCandyConfig] = React.useState(
    (params.config as string) || '',
  );
  const [candyUUID, setCandyUUID] = React.useState(
    (params.uuid as string) || '',
  );
  const [masterMint, setMasterMint] = React.useState(
    (params.master as string) || '',
  );
  const [editionStr, setEditionStr] = React.useState(
    (params.edition as string) || '',
  );
  const [handle, setHandle] = React.useState((params.handle as string) || '');
  const [amountStr, setAmount] = React.useState(
    (params.amount as string) || '',
  );
  const [indexStr, setIndex] = React.useState((params.index as string) || '');
  const [pinStr, setPin] = React.useState((params.pin as string) || '');
  const [proofStr, setProof] = React.useState((params.proof as string) || '');
  const [commMethod, setCommMethod] = React.useState(
    params.method || 'aws-email',
  );

  const allFieldsPopulated =
    distributor.length > 0 &&
    (claimMethod === 'transfer'
      ? tokenAcc.length > 0
      : claimMethod === 'candy'
      ? candyConfig.length > 0 && candyUUID.length > 0
      : claimMethod === 'edition'
      ? masterMint.length > 0 && editionStr.length > 0
      : false) &&
    handle.length > 0 &&
    amountStr.length > 0 &&
    indexStr.length > 0;
  // NB: pin can be empty if handle is a public-key and we are claiming through wallets
  // NB: proof can be empty!

  const [editable, setEditable] = React.useState(!allFieldsPopulated);

  // temporal verification
  const [transaction, setTransaction] =
    React.useState<ClaimTransactions | null>(null);
  const [OTPStr, setOTPStr] = React.useState('');

  // async computed
  const [asyncNeedsTemporalSigner, setNeedsTemporalSigner] =
    React.useState<boolean>(true);

  React.useEffect(() => {
    const wrap = async () => {
      try {
        setNeedsTemporalSigner(
          await fetchNeedsTemporalSigner(
            connection,
            distributor,
            indexStr,
            claimMethod,
          ),
        );
      } catch {
        // TODO: log?
      }
    };
    wrap();
  }, [connection, distributor, indexStr, claimMethod]);

  const lambdaAPIEndpoint =
    'https://{PLACEHOLDER-API-ID}.execute-api.us-east-2.amazonaws.com/send-OTP';

  const skipAWSWorkflow = false;

  const sendOTP = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const index = Number(indexStr);
    const amount = Number(amountStr);
    let pin: BN | null = null;

    if (isNaN(amount)) {
      throw new Error(`Could not parse amount ${amountStr}`);
    }
    if (isNaN(index)) {
      throw new Error(`Could not parse index ${indexStr}`);
    }
    if (params.pin !== 'NA') {
      try {
        pin = new BN(pinStr);
      } catch (err) {
        throw new Error(`Could not parse pin ${pinStr}: ${err}`);
      }
    }

    // TODO: use cached?
    const [distributorKey, distributorInfo] = await fetchDistributor(
      connection,
      distributor,
    );

    console.log('Distributor', distributorInfo);

    const proof =
      proofStr === ''
        ? []
        : proofStr.split(',').map(b => {
            const ret = Buffer.from(bs58.decode(b));
            if (ret.length !== 32) throw new Error(`Invalid proof hash length`);
            return ret;
          });

    let instructions, pdaSeeds, extraSigners;
    if (claimMethod === 'candy') {
      console.log('Building candy claim');
      [instructions, pdaSeeds, extraSigners] = await buildCandyClaim(
        connection,
        wallet.publicKey,
        distributorKey,
        distributorInfo,
        candyConfig,
        candyUUID,
        proof,
        handle,
        amount,
        index,
        pin,
      );
    } else if (claimMethod === 'transfer') {
      [instructions, pdaSeeds, extraSigners] = await buildMintClaim(
        connection,
        wallet.publicKey,
        distributorKey,
        distributorInfo,
        tokenAcc,
        proof,
        handle,
        amount,
        index,
        pin,
      );
    } else if (claimMethod === 'edition') {
      const edition = Number(editionStr);
      if (isNaN(edition)) {
        throw new Error(`Could not parse edition ${editionStr}`);
      }
      [instructions, pdaSeeds, extraSigners] = await buildEditionClaim(
        connection,
        wallet.publicKey,
        distributorKey,
        distributorInfo,
        masterMint,
        edition,
        proof,
        handle,
        amount,
        index,
        pin,
      );
    } else {
      throw new Error(`Unknown claim method ${claimMethod}`);
    }

    // NB: if we're claiming through wallets then pdaSeeds should be empty
    // since the secret is the wallet key (which is also a signer)
    if (pin === null && pdaSeeds.length > 0) {
      throw new Error(
        `Internal error: PDA generated when distributing to wallet directly`,
      );
    }

    const signersOf = (instrs: Array<TransactionInstruction>) => {
      const signers = new Set<PublicKey>();
      for (const instr of instrs) {
        for (const key of instr.keys) if (key.isSigner) signers.add(key.pubkey);
      }
      return signers;
    };

    const recentBlockhash = (
      await connection.getRecentBlockhash('singleGossip')
    ).blockhash;
    let setupTx: Transaction | null = null;
    if (instructions.length > 1) {
      setupTx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash,
      });

      const setupInstrs = instructions.slice(0, -1);
      const setupSigners = signersOf(setupInstrs);
      console.log(
        `Expecting the following setup signers: ${[...setupSigners].map(s =>
          s.toBase58(),
        )}`,
      );
      setupTx.add(...setupInstrs);
      setupTx.setSigners(...setupSigners);

      if (extraSigners.length > 0) {
        setupTx.partialSign(...extraSigners);
      }
    }

    const claimTx = new Transaction({
      feePayer: wallet.publicKey,
      recentBlockhash,
    });

    const claimInstrs = instructions.slice(-1);
    const claimSigners = signersOf(claimInstrs);
    console.log(
      `Expecting the following claim signers: ${[...claimSigners].map(s =>
        s.toBase58(),
      )}`,
    );
    claimTx.add(...claimInstrs);
    claimTx.setSigners(...claimSigners);

    const txnNeedsTemporalSigner = claimTx.signatures.some(s =>
      s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
    );
    if (txnNeedsTemporalSigner && !skipAWSWorkflow) {
      const otpQuery: { [key: string]: any } = {
        method: 'send',
        transaction: bs58.encode(claimTx.serializeMessage()),
        seeds: pdaSeeds,
        comm: commMethod,
      };
      const params = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpQuery),
      };

      const response = await fetch(lambdaAPIEndpoint, params);
      console.log(response);

      if (response.status !== 200) {
        throw new Error(`Failed to send AWS OTP`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Could not parse AWS OTP response`);
      }

      console.log('AWS OTP response data:', data);

      let succeeded, toCheck;
      switch (commMethod) {
        case 'discord': {
          succeeded = !!data.id;
          toCheck = 'discord';
          break;
        }
        case 'aws-email': {
          succeeded = !!data.MessageId;
          toCheck = 'email';
          break;
        }
        case 'aws-sms': {
          succeeded = !!data.MessageId;
          toCheck = 'SMS';
          break;
        }
      }

      if (!succeeded) {
        throw new Error(`Failed to send AWS OTP`);
      }

      notify({
        message: 'OTP sent',
        description: `Please check your ${toCheck} (${handle}) for an OTP`,
      });
    }

    return {
      setup: setupTx,
      claim: claimTx,
    };
  };

  const verifyOTP = async (
    e: React.SyntheticEvent,
    transaction: ClaimTransactions | null,
  ) => {
    e.preventDefault();

    if (!transaction) {
      throw new Error(`Transaction not available for OTP verification`);
    }

    if (!wallet.connected || wallet.publicKey === null) {
      throw new Error(`Wallet not connected`);
    }

    const txnNeedsTemporalSigner = transaction.claim.signatures.some(s =>
      s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
    );
    if (txnNeedsTemporalSigner && !skipAWSWorkflow) {
      // TODO: distinguish between OTP failure and transaction-error. We can try
      // again on the former but not the latter
      const OTP = Number(OTPStr);
      if (isNaN(OTP) || OTPStr.length === 0) {
        throw new Error(`Could not parse OTP ${OTPStr}`);
      }

      const params = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        FunctionName: 'send-OTP',
        body: JSON.stringify({
          method: 'verify',
          otp: OTP,
          handle: handle, // TODO?
        }),
      };

      const response = await fetch(lambdaAPIEndpoint, params);
      console.log(response);

      if (response.status !== 200) {
        const blob = JSON.stringify(response);
        throw new Error(`Failed to verify AWS OTP. ${blob}`);
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Could not parse AWS OTP verification response`);
      }

      console.log('AWS verify response data:', data);

      let sig;
      try {
        sig = bs58.decode(data);
      } catch {
        throw new Error(`Could not decode transaction signature ${data.body}`);
      }

      transaction.claim.addSignature(GUMDROP_TEMPORAL_SIGNER, sig);
    }

    let fullySigned;
    try {
      fullySigned = await wallet.signAllTransactions(
        transaction.setup === null
          ? [transaction.claim]
          : [transaction.setup, transaction.claim],
      );
    } catch {
      throw new Error('Failed to sign transaction');
    }

    for (let idx = 0; idx < fullySigned.length; ++idx) {
      const tx = fullySigned[idx];
      const result = await sendSignedTransaction({
        connection,
        signedTransaction: tx,
      });
      console.log(result);
      notify({
        message: `Claim succeeded: ${idx + 1} of ${fullySigned.length}`,
        description: (
          <HyperLink href={explorerLinkFor(result.txid, connection)}>
            View transaction on explorer
          </HyperLink>
        ),
      });
    }

    setTransaction(null);
    try {
      setNeedsTemporalSigner(
        await fetchNeedsTemporalSigner(
          connection,
          distributor,
          indexStr,
          claimMethod,
        ),
      );
    } catch {
      // TODO: log?
    }
  };

  const [loading, setLoading] = React.useState(false);
  const loadingProgress = () => (
    <CircularProgress
      size={24}
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: '-12px',
        marginLeft: '-12px',
      }}
    />
  );

  const verifyOTPC = onClick => (
    <React.Fragment>
      <TextField
        id="otp-text-field"
        label="OTP"
        value={OTPStr}
        onChange={e => setOTPStr(e.target.value)}
      />
      <Box />

      <Box sx={{ position: 'relative' }}>
        <Button
          disabled={!wallet.connected || !OTPStr || loading}
          variant="contained"
          color="success"
          style={{ width: '100%' }}
          onClick={e => {
            setLoading(true);
            const wrap = async () => {
              try {
                await verifyOTP(e, transaction);
                setLoading(false);
                onClick();
              } catch (err) {
                notify({
                  message: 'Claim failed',
                  description: `${err}`,
                });
                setLoading(false);
              }
            };
            wrap();
          }}
        >
          Claim Gumdrop
        </Button>
        {loading && loadingProgress()}
      </Box>
    </React.Fragment>
  );

  const claimData = claimMethod => {
    if (claimMethod === 'candy') {
      return (
        <React.Fragment>
          <TextField
            id="config-text-field"
            label="Candy Config"
            value={candyConfig}
            onChange={e => setCandyConfig(e.target.value)}
            disabled={!editable}
          />
          <TextField
            id="config-uuid-text-field"
            label="Candy UUID"
            value={candyUUID}
            onChange={e => setCandyUUID(e.target.value)}
            disabled={!editable}
          />
        </React.Fragment>
      );
    } else if (claimMethod === 'transfer') {
      return (
        <React.Fragment>
          <TextField
            id="token-acc-text-field"
            label="Source Token Account"
            value={tokenAcc}
            onChange={e => setTokenAcc(e.target.value)}
            disabled={!editable}
          />
        </React.Fragment>
      );
    } else if (claimMethod === 'edition') {
      return (
        <React.Fragment>
          <TextField
            id="master-mint-text-field"
            label="Master Mint"
            value={masterMint}
            onChange={e => setMasterMint(e.target.value)}
            disabled={!editable}
          />
          <TextField
            id="edition-text-field"
            label="Edition"
            value={editionStr}
            onChange={e => setEditionStr(e.target.value)}
            disabled={!editable}
          />
        </React.Fragment>
      );
    }
  };

  const populateClaimC = onClick => (
    <React.Fragment>
      <TextField
        id="distributor-text-field"
        label="Distributor"
        value={distributor}
        onChange={e => setDistributor(e.target.value)}
        disabled={!editable}
      />
      <FormControl fullWidth>
        <InputLabel id="claim-method-label" disabled={!editable}>
          Claim Method
        </InputLabel>
        <Select
          labelId="claim-method-label"
          id="claim-method-select"
          value={claimMethod}
          label="Claim Method"
          onChange={e => {
            setClaimMethod(e.target.value);
          }}
          style={{ textAlign: 'left' }}
          disabled={!editable}
        >
          <MenuItem value={'transfer'}>Token Transfer</MenuItem>
          <MenuItem value={'candy'}>Candy Machine</MenuItem>
          <MenuItem value={'edition'}>Limited Edition</MenuItem>
        </Select>
      </FormControl>
      {claimMethod !== '' && claimData(claimMethod)}
      {claimMethod !== 'edition' && (
        <TextField
          id="amount-text-field"
          label="Amount"
          value={amountStr}
          onChange={e => setAmount(e.target.value)}
          disabled={!editable}
        />
      )}
      <FormControl fullWidth>
        <InputLabel id="comm-method-label" disabled={!editable}>
          Distribution Method
        </InputLabel>
        <Select
          labelId="comm-method-label"
          id="comm-method-select"
          value={commMethod}
          label="Distribution Method"
          onChange={e => {
            if (e.target.value === 'discord') {
              notify({
                message: 'Discord distribution unavailable',
                description:
                  'Please use the CLI for this. Discord does not support browser-connection requests',
              });
              return;
            }
            localStorage.setItem('commMethod', e.target.value);
            setCommMethod(e.target.value);
          }}
          style={{ textAlign: 'left' }}
          disabled={!editable}
        >
          <MenuItem value={'aws-email'}>AWS Email</MenuItem>
          <MenuItem value={'aws-sms'}>AWS SMS</MenuItem>
          <MenuItem value={'discord'}>Discord</MenuItem>
          <MenuItem value={'wallets'}>Wallets</MenuItem>
          <MenuItem value={'manual'}>Manual</MenuItem>
        </Select>
      </FormControl>
      <TextField
        id="handle-text-field"
        label="Handle"
        value={handle}
        onChange={e => setHandle(e.target.value)}
        disabled={!editable}
      />
      <TextField
        id="index-text-field"
        label="Index"
        value={indexStr}
        onChange={e => setIndex(e.target.value)}
        disabled={!editable}
      />
      {params.pin !== 'NA' && (
        <TextField
          id="pin-text-field"
          label="Pin"
          value={pinStr}
          onChange={e => setPin(e.target.value)}
          disabled={!editable}
        />
      )}
      <TextField
        id="proof-text-field"
        label="Proof"
        multiline
        value={proofStr}
        onChange={e => setProof(e.target.value)}
        disabled={!editable}
      />
      <Button color="info" onClick={() => setEditable(!editable)}>
        {!editable ? 'Edit Claim' : 'Stop Editing'}
      </Button>
      <Box />

      <Box sx={{ position: 'relative' }}>
        <Button
          disabled={!wallet.connected || !allFieldsPopulated || loading}
          variant="contained"
          style={{ width: '100%' }}
          color={asyncNeedsTemporalSigner ? 'primary' : 'success'}
          onClick={e => {
            setLoading(true);
            const wrap = async () => {
              try {
                const needsTemporalSigner = await fetchNeedsTemporalSigner(
                  connection,
                  distributor,
                  indexStr,
                  claimMethod,
                );
                const transaction = await sendOTP(e);
                if (!needsTemporalSigner) {
                  await verifyOTP(e, transaction);
                } else {
                  setTransaction(transaction);
                }
                setLoading(false);
                onClick();
              } catch (err) {
                notify({
                  message: 'Claim failed',
                  description: `${err}`,
                });
                setLoading(false);
              }
            };
            wrap();
          }}
        >
          {asyncNeedsTemporalSigner ? 'Next' : 'Claim Gumdrop'}
        </Button>
        {loading && loadingProgress()}
      </Box>
    </React.Fragment>
  );

  const steps = [{ name: 'Populate Claim', inner: populateClaimC }];
  if (asyncNeedsTemporalSigner) {
    steps.push({ name: 'Verify OTP', inner: verifyOTPC });
  }

  // TODO: better interaction between setting `asyncNeedsTemporalSigner` and
  // the stepper... this is pretty jank
  const [activeStep, setActiveStep] = React.useState(0);
  const stepToUse = Math.min(activeStep, steps.length - 1);

  const handleNext = () => {
    // return to start if going past the end (claim succeeded)
    setActiveStep(prev => {
      if (prev === steps.length - 1) {
        return 0;
      } else {
        return prev + 1;
      }
    });
  };
  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const stepper = (
    <React.Fragment>
      <Stepper activeStep={stepToUse}>
        {steps.map(s => {
          return (
            <Step key={s.name}>
              <StepLabel>{s.name}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <Box />
    </React.Fragment>
  );

  return (
    <Stack spacing={2}>
      {asyncNeedsTemporalSigner && stepper}
      {steps[stepToUse].inner(handleNext)}
      {stepToUse > 0 && (
        <Button color="info" onClick={handleBack}>
          Back
        </Button>
      )}
    </Stack>
  );
};
