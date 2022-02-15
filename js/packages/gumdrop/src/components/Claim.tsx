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

import { useAnchorWallet } from '@solana/wallet-adapter-react';
import {
  AccountMeta,
  Connection as RPCConnection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  SYSVAR_RENT_PUBKEY,
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
import BN from 'bn.js';
import * as bs58 from 'bs58';
import * as anchor from '@project-serum/anchor';

import { useWindowDimensions } from './AppBar';
import { CollapsePanel } from './CollapsePanel';
import { useConnection } from '../contexts/ConnectionContext';
import {
  CANDY_MACHINE_ID,
  GUMDROP_DISTRIBUTOR_ID,
  GUMDROP_TEMPORAL_SIGNER,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from '../utils/ids';
import {
  getCandyMachine,
  getATA,
  getEdition,
  getEditionMarkerPda,
  getMetadata,
} from '../utils/accounts';
import { MerkleTree } from '../utils/merkleTree';
import { explorerLinkFor, sendSignedTransaction } from '../utils/transactions';

export const chunk = (arr: Buffer, len: number): Array<Buffer> => {
  const chunks: Array<Buffer> = [];
  const n = arr.length;
  let i = 0;

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)));
  }

  return chunks;
};

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

type ClaimInstructions = {
  setup: Array<TransactionInstruction> | null;
  claim: Array<TransactionInstruction>;
};

const buildMintClaim = async (
  program: anchor.Program,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorInfo: any,
  tokenAcc: string,
  proof: Array<Buffer>,
  handle: string,
  amount: number,
  index: number,
  pin: BN | null,
): Promise<[ClaimInstructions, Array<Buffer>, Array<Keypair>]> => {
  let tokenAccKey: PublicKey;
  try {
    tokenAccKey = new PublicKey(tokenAcc);
  } catch (err) {
    throw new Error(`Invalid tokenAcc key ${err}`);
  }
  const distTokenAccount = await program.provider.connection.getAccountInfo(
    tokenAccKey,
  );
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

  const setup: Array<TransactionInstruction> = [];

  const walletTokenKey = await getATA(walletKey, mint);
  if (
    (await program.provider.connection.getAccountInfo(walletTokenKey)) === null
  ) {
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

  const claimAirdrop = await program.instruction.claim(
    cbump,
    new BN(index),
    new BN(amount),
    secret,
    proof,
    {
      accounts: {
        distributor: distributorKey,
        claimStatus,
        from: tokenAccKey,
        to: walletTokenKey,
        temporal: temporalSigner,
        payer: walletKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    },
  );

  return [{ setup, claim: [claimAirdrop] }, pdaSeeds, []];
};

const buildCandyClaim = async (
  program: anchor.Program,
  candyProgram: anchor.Program,
  walletKey: PublicKey,
  distributorKey: PublicKey,
  distributorInfo: any,
  tokenAcc: string,
  candyMachineStr: string,
  proof: Array<Buffer>,
  handle: string,
  amount: number,
  index: number,
  pin: BN | null,
): Promise<[ClaimInstructions, Array<Buffer>, Array<Keypair>]> => {
  let tokenAccKey: PublicKey;
  try {
    tokenAccKey = new PublicKey(tokenAcc);
  } catch (err) {
    throw new Error(`Invalid tokenAcc key ${err}`);
  }

  let candyMachineKey: PublicKey;
  try {
    candyMachineKey = new PublicKey(candyMachineStr);
  } catch (err) {
    throw new Error(`Invalid candy machine key ${err}`);
  }

  const connection = program.provider.connection;
  const candyMachine = await getCandyMachine(connection, candyMachineKey);
  console.log('Candy Machine', candyMachine);

  if (!candyMachine.data.whitelistMintSettings) {
    // soft error?
    throw new Error(
      `Candy machine doesn't seem to have a whitelist mint. You can mint normally!`,
    );
  }
  const whitelistMint = candyMachine.data.whitelistMintSettings.mint;

  const [secret, pdaSeeds] = await walletKeyOrPda(
    walletKey,
    handle,
    pin,
    whitelistMint,
  );

  // TODO: since it's in the PDA do we need it to be in the leaf?
  const leaf = Buffer.from([
    ...new BN(index).toArray('le', 8),
    ...secret.toBuffer(),
    ...whitelistMint.toBuffer(),
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

  // candy machine mints fit in a single transaction
  const merkleClaim: Array<TransactionInstruction> = [];

  if ((await connection.getAccountInfo(claimStatus)) === null) {
    // atm the contract has a special case for when the temporal key is defaulted
    // (aka always passes temporal check)
    // TODO: more flexible
    const temporalSigner =
      distributorInfo.temporal.equals(PublicKey.default) ||
      secret.equals(walletKey)
        ? walletKey
        : distributorInfo.temporal;

    const walletTokenKey = await getATA(walletKey, whitelistMint);
    if ((await connection.getAccountInfo(walletTokenKey)) === null) {
      merkleClaim.push(
        Token.createAssociatedTokenAccountInstruction(
          SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          candyMachine.data.whitelistMintSettings.mint,
          walletTokenKey,
          walletKey,
          walletKey,
        ),
      );
    }

    merkleClaim.push(
      await program.instruction.claim(
        cbump,
        new BN(index),
        new BN(amount),
        secret,
        proof,
        {
          accounts: {
            distributor: distributorKey,
            claimStatus,
            from: tokenAccKey,
            to: walletTokenKey,
            temporal: temporalSigner,
            payer: walletKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          },
        },
      ),
    );
  }

  const candyMachineMint = Keypair.generate();
  const candyMachineMetadata = await getMetadata(candyMachineMint.publicKey);
  const candyMachineMaster = await getEdition(candyMachineMint.publicKey);

  const [candyMachineCreatorKey, candyMachineCreatorBump] =
    await PublicKey.findProgramAddress(
      [Buffer.from('candy_machine'), candyMachineKey.toBuffer()],
      CANDY_MACHINE_ID,
    );

  const remainingAccounts: Array<AccountMeta> = [];

  if (candyMachine.data.whitelistMintSettings) {
    const whitelistATA = await getATA(walletKey, whitelistMint);
    remainingAccounts.push({
      pubkey: whitelistATA,
      isWritable: true,
      isSigner: false,
    });

    if (candyMachine.data.whitelistMintSettings.mode.burnEveryTime) {
      remainingAccounts.push({
        pubkey: whitelistMint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: walletKey,
        isWritable: false,
        isSigner: true,
      });
    }
  }

  if (candyMachine.tokenMint) {
    const tokenMintATA = await getATA(walletKey, candyMachine.tokenMint);

    remainingAccounts.push({
      pubkey: tokenMintATA,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: walletKey,
      isWritable: false,
      isSigner: true,
    });
  }

  const candyMachineClaim: Array<TransactionInstruction> = [];
  await createMintAndAccount(
    connection,
    walletKey,
    candyMachineMint.publicKey,
    candyMachineClaim,
  );
  candyMachineClaim.push(
    await candyProgram.instruction.mintNft(candyMachineCreatorBump, {
      accounts: {
        candyMachine: candyMachineKey,
        candyMachineCreator: candyMachineCreatorKey,
        payer: walletKey,
        wallet: candyMachine.wallet,
        metadata: candyMachineMetadata,
        mint: candyMachineMint.publicKey,
        mintAuthority: walletKey,
        updateAuthority: walletKey,
        masterEdition: candyMachineMaster,

        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
        recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      remainingAccounts,
    }),
  );

  return [
    { setup: merkleClaim, claim: candyMachineClaim },
    pdaSeeds,
    [candyMachineMint],
  ];
};

const createMintAndAccount = async (
  connection: RPCConnection,
  walletKey: PublicKey,
  mint: PublicKey,
  setup: Array<TransactionInstruction>,
) => {
  const walletTokenKey = await getATA(walletKey, mint);

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
  program: anchor.Program,
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
): Promise<[ClaimInstructions, Array<Buffer>, Array<Keypair>]> => {
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

  const claimCountAccount = await program.provider.connection.getAccountInfo(
    claimCount,
  );
  if (claimCountAccount !== null) {
    throw new Error(`This edition was already claimed`);
  }

  const setup: Array<TransactionInstruction> = [];

  const newMint = Keypair.generate();
  const newMetadataKey = await getMetadata(newMint.publicKey);
  const masterMetadataKey = await getMetadata(masterMintKey);
  const newEdition = await getEdition(newMint.publicKey);
  const masterEdition = await getEdition(masterMintKey);

  await createMintAndAccount(
    program.provider.connection,
    walletKey,
    newMint.publicKey,
    setup,
  );

  const distributorTokenKey = await getATA(distributorKey, masterMintKey);
  const editionMarkKey = await getEditionMarkerPda(
    masterMintKey,
    new BN(edition),
  );

  const claim = await program.instruction.claimEdition(
    cbump,
    new BN(index),
    new BN(amount),
    new BN(edition),
    secret,
    proof,
    {
      accounts: {
        distributor: distributorKey,
        claimCount,
        temporal: temporalSigner,
        payer: walletKey,
        metadataNewMetadata: newMetadataKey,
        metadataNewEdition: newEdition,
        metadataMasterEdition: masterEdition,
        metadataNewMint: newMint.publicKey,
        metadataEditionMarkPda: editionMarkKey,
        metadataNewMintAuthority: walletKey,
        metadataMasterTokenAccount: distributorTokenKey,
        metadataNewUpdateAuthority: walletKey,
        metadataMasterMetadata: masterMetadataKey,
        metadataMasterMint: masterMintKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      },
    },
  );

  return [{ setup, claim: [claim] }, pdaSeeds, [newMint]];
};

const fetchDistributor = async (
  program: anchor.Program,
  distributorStr: string,
) => {
  let key;
  try {
    key = new PublicKey(distributorStr);
  } catch (err) {
    throw new Error(`Invalid distributor key ${err}`);
  }
  const info = await program.account.merkleDistributor.fetch(key);
  return [key, info];
};

const fetchNeedsTemporalSigner = async (
  program: anchor.Program,
  distributorStr: string,
  indexStr: string,
  claimMethod: string,
) => {
  const [key, info] = await fetchDistributor(program, distributorStr);
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
    const claimCountAccount = await program.provider.connection.getAccountInfo(
      claimCount,
    );
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

type Programs = {
  gumdrop: anchor.Program;
  candyMachine: anchor.Program;
};

export const Claim = (props: RouteComponentProps<ClaimProps>) => {
  const connection = useConnection();
  const wallet = useAnchorWallet();

  const [program, setProgram] = React.useState<Programs | null>(null);

  React.useEffect(() => {
    if (!wallet) {
      return;
    }

    const wrap = async () => {
      try {
        const provider = new anchor.Provider(connection, wallet, {
          preflightCommitment: 'recent',
        });
        const [gumdropIdl, candyIdl] = await Promise.all([
          anchor.Program.fetchIdl(GUMDROP_DISTRIBUTOR_ID, provider),
          anchor.Program.fetchIdl(CANDY_MACHINE_ID, provider),
        ]);

        if (!gumdropIdl) throw new Error('Failed to fetch gumdrop IDL');
        if (!candyIdl) throw new Error('Failed to fetch candy machine IDL');

        setProgram({
          gumdrop: new anchor.Program(
            gumdropIdl,
            GUMDROP_DISTRIBUTOR_ID,
            provider,
          ),
          candyMachine: new anchor.Program(
            candyIdl,
            CANDY_MACHINE_ID,
            provider,
          ),
        });
      } catch (err) {
        console.error('Failed to fetch IDL', err);
      }
    };
    wrap();
  }, [wallet]);

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
    params.candy
      ? 'candy'
      : params.tokenAcc
      ? 'transfer'
      : params.master
      ? 'edition'
      : '',
  );
  const [tokenAcc, setTokenAcc] = React.useState(
    (params.tokenAcc as string) || '',
  );
  const [candyMachine, setCandyMachine] = React.useState(
    (params.candy as string) || '',
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
      ? tokenAcc.length > 0 && candyMachine.length > 0
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
        if (!program) return;
        setNeedsTemporalSigner(
          await fetchNeedsTemporalSigner(
            program.gumdrop,
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
  }, [program, distributor, indexStr, claimMethod]);

  const lambdaAPIEndpoint =
    'https://{PLACEHOLDER-API-ID}.execute-api.us-east-2.amazonaws.com/send-OTP';

  const skipAWSWorkflow = false;

  const sendOTP = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    if (!wallet || !program) {
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
      program.gumdrop,
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
        program.gumdrop,
        program.candyMachine,
        wallet.publicKey,
        distributorKey,
        distributorInfo,
        tokenAcc,
        candyMachine,
        proof,
        handle,
        amount,
        index,
        pin,
      );
    } else if (claimMethod === 'transfer') {
      [instructions, pdaSeeds, extraSigners] = await buildMintClaim(
        program.gumdrop,
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
        program.gumdrop,
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
      return [...signers];
    };

    const partialSignExtra = (tx: Transaction, expected: Array<PublicKey>) => {
      const matching = extraSigners.filter(kp =>
        expected.find(p => p.equals(kp.publicKey)),
      );
      if (matching.length > 0) {
        tx.partialSign(...matching);
      }
    };

    const recentBlockhash = (
      await connection.getRecentBlockhash('singleGossip')
    ).blockhash;
    let setupTx: Transaction | null = null;
    if (instructions.setup !== null && instructions.setup.length !== 0) {
      setupTx = new Transaction({
        feePayer: wallet.publicKey,
        recentBlockhash,
      });

      const setupInstrs = instructions.setup;
      const setupSigners = signersOf(setupInstrs);
      console.log(
        `Expecting the following setup signers: ${setupSigners.map(s =>
          s.toBase58(),
        )}`,
      );
      setupTx.add(...setupInstrs);
      setupTx.setSigners(...setupSigners);
      partialSignExtra(setupTx, setupSigners);
    }

    const claimTx = new Transaction({
      feePayer: wallet.publicKey,
      recentBlockhash,
    });

    const claimInstrs = instructions.claim;
    const claimSigners = signersOf(claimInstrs);
    console.log(
      `Expecting the following claim signers: ${claimSigners.map(s =>
        s.toBase58(),
      )}`,
    );
    claimTx.add(...claimInstrs);
    claimTx.setSigners(...claimSigners);
    partialSignExtra(claimTx, claimSigners);

    const txnNeedsTemporalSigner = claimTx.signatures.some(s =>
      s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
    )
      ? claimTx
      : setupTx &&
        setupTx.signatures.some(s =>
          s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
        )
      ? setupTx
      : /*otherwise*/ null;
    if (txnNeedsTemporalSigner !== null && !skipAWSWorkflow) {
      const otpQuery: { [key: string]: any } = {
        method: 'send',
        transaction: bs58.encode(txnNeedsTemporalSigner.serializeMessage()),
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

    if (!wallet || !program) {
      throw new Error(`Wallet not connected`);
    }

    const claimTx = transaction.claim;
    const setupTx = transaction.setup;
    const txnNeedsTemporalSigner = claimTx.signatures.some(s =>
      s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
    )
      ? claimTx
      : setupTx &&
        setupTx.signatures.some(s =>
          s.publicKey.equals(GUMDROP_TEMPORAL_SIGNER),
        )
      ? setupTx
      : /*otherwise*/ null;
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

      txnNeedsTemporalSigner.addSignature(GUMDROP_TEMPORAL_SIGNER, sig);
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
          program.gumdrop,
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
          disabled={!wallet || !program || !OTPStr || loading}
          variant="contained"
          color="secondary"
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
            id="token-acc-text-field"
            label="Whitelist Token Account"
            value={tokenAcc}
            onChange={e => setTokenAcc(e.target.value)}
            disabled={!editable}
          />
          <TextField
            id="candy-text-field"
            label="Candy Machine"
            value={candyMachine}
            onChange={e => setCandyMachine(e.target.value)}
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
      <Box />
      <FormControl fullWidth>
        <InputLabel id="claim-method-label" disabled={!editable}>
          Gumdrop Type
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
      <TextField
        id="distributor-text-field"
        label="Gumdrop Address"
        value={distributor}
        onChange={e => setDistributor(e.target.value)}
        disabled={!editable}
      />
      <TextField
        id="handle-text-field"
        label="Handle"
        value={handle}
        onChange={e => setHandle(e.target.value)}
        disabled={!editable}
      />
      {claimMethod !== 'edition' && (
        <TextField
          id="amount-text-field"
          label="Amount"
          value={amountStr}
          onChange={e => setAmount(e.target.value)}
          disabled={!editable}
        />
      )}
      {claimMethod !== '' && claimData(claimMethod)}

      <CollapsePanel
        id="additional-parameters"
        panelName="Additional Parameters"
      >
        <Stack spacing={2}>
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
                localStorage.setItem('commMethod', e.target.value as string);
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
          <Button onClick={() => setEditable(!editable)}>
            {!editable ? 'Edit Claim' : 'Stop Editing'}
          </Button>
        </Stack>
      </CollapsePanel>

      <Box />

      <Box sx={{ position: 'relative' }}>
        <Button
          disabled={!wallet || !program || !allFieldsPopulated || loading}
          variant="contained"
          style={{ width: '100%' }}
          color={asyncNeedsTemporalSigner ? 'primary' : 'secondary'}
          onClick={e => {
            setLoading(true);
            const wrap = async () => {
              try {
                if (!program) {
                  throw new Error(
                    `Internal error: no program loaded for claim`,
                  );
                }
                const needsTemporalSigner = await fetchNeedsTemporalSigner(
                  program.gumdrop,
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
    </React.Fragment>
  );

  const maxWidth = 960;
  const { width } = useWindowDimensions();

  return (
    <Stack
      spacing={2}
      style={{
        margin: 'auto',
        maxWidth: Math.min(width, maxWidth),
      }}
    >
      {asyncNeedsTemporalSigner && stepper}
      {steps[stepToUse].inner(handleNext)}
      {stepToUse > 0 && <Button onClick={handleBack}>Back</Button>}
    </Stack>
  );
};
