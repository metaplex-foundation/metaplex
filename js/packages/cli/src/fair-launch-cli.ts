#!/usr/bin/env node
import * as fs from 'fs';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token, MintLayout } from '@solana/spl-token';
import {
  CACHE_PATH,
  FAIR_LAUNCH_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from './helpers/constants';
import {
  loadFairLaunchProgram,
  loadWalletKey,
  getTokenMint,
  getFairLaunch,
  getTreasury,
  getFairLaunchTicket,
  getAtaForMint,
  getFairLaunchTicketSeqLookup,
  getFairLaunchLotteryBitmap,
  getMetadata,
  getParticipationMint,
  getParticipationToken,
  getMasterEdition,
  getEditionMarkPda,
} from './helpers/accounts';
import { chunks, getMultipleAccounts, sleep } from './helpers/various';
import { createAssociatedTokenAccountInstruction } from './helpers/instructions';
import { sendTransactionWithRetryWithKeypair } from './helpers/transactions';
program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

const FAIR_LAUNCH_LOTTERY_SIZE =
  8 + // discriminator
  32 + // fair launch
  1 + // bump
  8; // size of bitmask ones

program
  .command('new_fair_launch')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-u, --uuid <string>', 'uuid')
  .option('-f, --fee <string>', 'fee', '2')
  .option('-s, --price-range-start <string>', 'price range start', '1')
  .option('-pe, --price-range-end <string>', 'price range end', '2')
  .option(
    '-arbp, --anti-rug-reserve-bp <string>',
    'optional anti-rug treasury reserve basis points (1-10000)',
  )
  .option(
    '-atc, --anti-rug-token-requirement <string>',
    'optional anti-rug token requirement when reserve opens - 100 means 100 tokens remaining out of total supply',
  )
  .option(
    '-sd, --self-destruct-date <string>',
    'optional date when funds from anti-rug setting will be returned - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option(
    '-pos, --phase-one-start-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option(
    '-poe, --phase-one-end-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option(
    '-pte, --phase-two-end-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option('-ld, --lottery-duration <string>', 'seconds eg 86400')
  .option('-ts, --tick-size <string>', 'tick size', '0.1')
  .option('-n, --number-of-tokens <number>', 'Number of tokens to sell')
  .option(
    '-mint, --treasury-mint <string>',
    'token mint to take as payment instead of sol',
  )
  .action(async (_, cmd) => {
    const {
      keypair,
      env,
      priceRangeStart,
      priceRangeEnd,
      phaseOneStartDate,
      phaseOneEndDate,
      phaseTwoEndDate,
      tickSize,
      numberOfTokens,
      fee,
      uuid,
      selfDestructDate,
      antiRugTokenRequirement,
      antiRugReserveBp,
      lotteryDuration,
      treasuryMint,
    } = cmd.opts();

    const antiRugTokenRequirementNumber = antiRugTokenRequirement
      ? parseInt(antiRugTokenRequirement)
      : null;
    const antiRugReserveBpNumber = antiRugReserveBp
      ? parseInt(antiRugReserveBp)
      : null;
    const selfDestructDateActual = selfDestructDate
      ? Date.parse(selfDestructDate) / 1000
      : null;

    const antiRug =
      antiRugTokenRequirementNumber &&
      antiRugReserveBpNumber &&
      selfDestructDateActual
        ? {
            reserveBp: antiRugReserveBpNumber,
            tokenRequirement: new anchor.BN(antiRugTokenRequirementNumber),
            selfDestructDate: new anchor.BN(selfDestructDateActual),
          }
        : null;

    const parsedNumber = parseInt(numberOfTokens);
    let priceRangeStartNumber = parseFloat(priceRangeStart);
    let priceRangeEndNumber = parseFloat(priceRangeEnd);
    let tickSizeNumber = parseFloat(tickSize);

    let feeNumber = parseFloat(fee);
    const realUuid = uuid.slice(0, 6);
    const phaseOneStartDateActual =
      (phaseOneStartDate ? Date.parse(phaseOneStartDate) : Date.now()) / 1000;
    const phaseOneEndDateActual =
      (phaseOneEndDate ? Date.parse(phaseOneEndDate) : Date.now() + 86400000) /
      1000;
    const phaseTwoEndDateActual =
      (phaseTwoEndDate
        ? Date.parse(phaseTwoEndDate)
        : Date.now() + 2 * 86400000) / 1000;
    const lotteryDurationActual = lotteryDuration ? lotteryDuration : 86400;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
    if (!treasuryMint) {
      priceRangeStartNumber = Math.ceil(
        priceRangeStartNumber * LAMPORTS_PER_SOL,
      );
      priceRangeEndNumber = Math.ceil(priceRangeEndNumber * LAMPORTS_PER_SOL);
      tickSizeNumber = Math.ceil(tickSizeNumber * LAMPORTS_PER_SOL);
      feeNumber = Math.ceil(feeNumber * LAMPORTS_PER_SOL);
    } else {
      const token = new Token(
        anchorProgram.provider.connection,
        //@ts-ignore
        new anchor.web3.PublicKey(treasuryMint),
        TOKEN_PROGRAM_ID,
        walletKeyPair,
      );

      const mintInfo = await token.getMintInfo();

      const mantissa = 10 ** mintInfo.decimals;
      priceRangeStartNumber = Math.ceil(priceRangeStartNumber * mantissa);
      priceRangeEndNumber = Math.ceil(priceRangeEndNumber * mantissa);
      tickSizeNumber = Math.ceil(tickSizeNumber * mantissa);
      feeNumber = Math.ceil(feeNumber * mantissa);
    }

    const [tokenMint, tokenBump] = await getTokenMint(
      walletKeyPair.publicKey,
      realUuid,
    );
    const [fairLaunch, fairLaunchBump] = await getFairLaunch(tokenMint);
    const [treasury, treasuryBump] = await getTreasury(tokenMint);

    const remainingAccounts = !treasuryMint
      ? []
      : [
          {
            pubkey: new anchor.web3.PublicKey(treasuryMint),
            isWritable: false,
            isSigner: false,
          },
        ];
    await anchorProgram.rpc.initializeFairLaunch(
      fairLaunchBump,
      treasuryBump,
      tokenBump,
      {
        uuid: realUuid,
        priceRangeStart: new anchor.BN(priceRangeStartNumber),
        priceRangeEnd: new anchor.BN(priceRangeEndNumber),
        phaseOneStart: new anchor.BN(phaseOneStartDateActual),
        phaseOneEnd: new anchor.BN(phaseOneEndDateActual),
        phaseTwoEnd: new anchor.BN(phaseTwoEndDateActual),
        lotteryDuration: new anchor.BN(lotteryDurationActual),
        tickSize: new anchor.BN(tickSizeNumber),
        numberOfTokens: new anchor.BN(parsedNumber),
        fee: new anchor.BN(feeNumber),
        antiRugSetting: antiRug,
      },
      {
        accounts: {
          fairLaunch,
          tokenMint,
          treasury,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        remainingAccounts,
        signers: [],
      },
    );

    console.log(`create fair launch Done: ${fairLaunch.toBase58()}`);
  });

program
  .command('update_fair_launch')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-u, --uuid <string>', 'uuid')
  .option('-f, --fee <string>', 'price range end', '2')
  .option('-s, --price-range-start <string>', 'price range start', '1')
  .option('-pe, --price-range-end <string>', 'price range end', '2')
  .option(
    '-arbp, --anti-rug-reserve-bp <string>',
    'optional anti-rug treasury reserve basis points (1-10000)',
  )
  .option(
    '-atc, --anti-rug-token-requirement <string>',
    'optional anti-rug token requirement when reserve opens - 100 means 100 tokens remaining out of total supply',
  )
  .option(
    '-sd, --self-destruct-date <string>',
    'optional date when funds from anti-rug setting will be returned - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option(
    '-pos, --phase-one-start-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option(
    '-poe, --phase-one-end-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option('-ld, --lottery-duration <string>', 'seconds eg 86400')
  .option(
    '-pte, --phase-two-end-date <string>',
    'timestamp - eg "04 Dec 1995 00:12:00 GMT"',
  )
  .option('-ts, --tick-size <string>', 'tick size', '0.1')
  .option('-n, --number-of-tokens <number>', 'Number of tokens to sell')
  .option(
    '-mint, --token-mint <string>',
    'token mint to take as payment instead of sol',
  )
  .action(async (_, cmd) => {
    const {
      keypair,
      env,
      priceRangeStart,
      priceRangeEnd,
      phaseOneStartDate,
      phaseOneEndDate,
      phaseTwoEndDate,
      tickSize,
      numberOfTokens,
      fee,
      mint,
      uuid,
      selfDestructDate,
      antiRugTokenRequirement,
      antiRugReserveBp,
      lotteryDuration,
    } = cmd.opts();
    const antiRugTokenRequirementNumber = antiRugTokenRequirement
      ? parseInt(antiRugTokenRequirement)
      : null;
    const antiRugReserveBpNumber = antiRugReserveBp
      ? parseInt(antiRugReserveBp)
      : null;
    const selfDestructDateActual = selfDestructDate
      ? Date.parse(selfDestructDate) / 1000
      : null;

    const antiRug =
      antiRugTokenRequirementNumber &&
      antiRugReserveBpNumber &&
      selfDestructDateActual
        ? {
            reserveBp: antiRugReserveBpNumber,
            tokenRequirement: new anchor.BN(antiRugTokenRequirementNumber),
            selfDestructDate: new anchor.BN(selfDestructDateActual),
          }
        : null;
    const parsedNumber = parseInt(numberOfTokens);
    let priceRangeStartNumber = parseFloat(priceRangeStart);
    let priceRangeEndNumber = parseFloat(priceRangeEnd);
    let tickSizeNumber = parseFloat(tickSize);
    let feeNumber = parseFloat(fee);
    const realUuid = uuid.slice(0, 6);
    const phaseOneStartDateActual =
      (phaseOneStartDate ? Date.parse(phaseOneStartDate) : Date.now()) / 1000;
    const phaseOneEndDateActual =
      (phaseOneEndDate ? Date.parse(phaseOneEndDate) : Date.now() + 86400000) /
      1000;
    const phaseTwoEndDateActual =
      (phaseTwoEndDate
        ? Date.parse(phaseTwoEndDate)
        : Date.now() + 2 * 86400000) / 1000;
    const lotteryDurationActual = lotteryDuration ? lotteryDuration : 86400;

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
    if (!mint) {
      priceRangeStartNumber = Math.ceil(
        priceRangeStartNumber * LAMPORTS_PER_SOL,
      );
      priceRangeEndNumber = Math.ceil(priceRangeEndNumber * LAMPORTS_PER_SOL);
      tickSizeNumber = Math.ceil(tickSizeNumber * LAMPORTS_PER_SOL);
      feeNumber = Math.ceil(feeNumber * LAMPORTS_PER_SOL);
    } else {
      const token = new Token(
        anchorProgram.provider.connection,
        //@ts-ignore
        fairLaunchObj.treasuryMint,
        TOKEN_PROGRAM_ID,
        walletKeyPair,
      );

      const mintInfo = await token.getMintInfo();

      const mantissa = 10 ** mintInfo.decimals;
      priceRangeStartNumber = Math.ceil(priceRangeStartNumber * mantissa);
      priceRangeEndNumber = Math.ceil(priceRangeEndNumber * mantissa);
      tickSizeNumber = Math.ceil(tickSizeNumber * mantissa);
      feeNumber = Math.ceil(feeNumber * mantissa);
    }

    const tokenMint = (
      await getTokenMint(walletKeyPair.publicKey, realUuid)
    )[0];
    const fairLaunch = (await getFairLaunch(tokenMint))[0];

    await anchorProgram.rpc.updateFairLaunch(
      {
        uuid: realUuid,
        priceRangeStart: new anchor.BN(priceRangeStartNumber),
        priceRangeEnd: new anchor.BN(priceRangeEndNumber),
        phaseOneStart: new anchor.BN(phaseOneStartDateActual),
        phaseOneEnd: new anchor.BN(phaseOneEndDateActual),
        phaseTwoEnd: new anchor.BN(phaseTwoEndDateActual),
        lotteryDuration: new anchor.BN(lotteryDurationActual),
        tickSize: new anchor.BN(tickSizeNumber),
        numberOfTokens: new anchor.BN(parsedNumber),
        fee: new anchor.BN(feeNumber),
        antiRugSetting: antiRug,
      },
      {
        accounts: {
          fairLaunch,
          authority: walletKeyPair.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      },
    );

    console.log(`Updated fair launch Done: ${fairLaunch.toBase58()}`);
  });

program
  .command('purchase_ticket')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-a, --amount <string>', 'amount')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, amount } = cmd.opts();
    let amountNumber = parseFloat(amount);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );
    const [fairLaunchTicket, bump] = await getFairLaunchTicket(
      //@ts-ignore
      fairLaunchObj.tokenMint,
      walletKeyPair.publicKey,
    );

    const remainingAccounts = [];
    const instructions = [];
    const signers = [];
    //@ts-ignore
    const tokenAta = fairLaunchObj.treasuryMint
      ? (
          await getAtaForMint(
            //@ts-ignore
            fairLaunchObj.treasuryMint,
            walletKeyPair.publicKey,
          )
        )[0]
      : undefined;

    //@ts-ignore
    if (!fairLaunchObj.treasuryMint) {
      amountNumber = Math.ceil(amountNumber * LAMPORTS_PER_SOL);
    } else {
      const transferAuthority = anchor.web3.Keypair.generate();
      signers.push(transferAuthority);
      const token = new Token(
        anchorProgram.provider.connection,
        //@ts-ignore
        fairLaunchObj.treasuryMint,
        TOKEN_PROGRAM_ID,
        walletKeyPair,
      );
      const mintInfo = await token.getMintInfo();
      amountNumber = Math.ceil(amountNumber * 10 ** mintInfo.decimals);

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          //@ts-ignore
          tokenAta,
          transferAuthority.publicKey,
          walletKeyPair.publicKey,
          [],
          amountNumber * 10 ** mintInfo.decimals +
            //@ts-ignore
            fairLaunchObj.data.fee.toNumber(),
        ),
      );

      remainingAccounts.push({
        //@ts-ignore
        pubkey: fairLaunchObj.treasuryMint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: tokenAta,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: transferAuthority.publicKey,
        isWritable: false,
        isSigner: true,
      });
      remainingAccounts.push({
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      });
    }

    instructions.push(
      await anchorProgram.instruction.purchaseTicket(
        bump,
        new anchor.BN(amountNumber),
        {
          accounts: {
            fairLaunchTicket,
            fairLaunch,
            //@ts-ignore
            treasury: fairLaunchObj.treasury,
            buyer: walletKeyPair.publicKey,
            payer: walletKeyPair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          },
          remainingAccounts,
        },
      ),
    );

    if (tokenAta) {
      instructions.push(
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          tokenAta,
          walletKeyPair.publicKey,
          [],
        ),
      );
    }

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      signers,
      'max',
    );
    console.log(
      `create fair launch ticket Done: ${fairLaunchTicket.toBase58()}. Trying to create seq now...we may or may not get a validator with data on chain. Either way, your ticket is secure.`,
    );

    let fairLaunchTicketObj;
    for (let i = 0; i < 10; i++) {
      await sleep(5000);
      try {
        fairLaunchTicketObj =
          await anchorProgram.account.fairLaunchTicket.fetch(fairLaunchTicket);
        break;
      } catch (e) {
        console.log('Not found. Trying again...');
      }
    }

    const [fairLaunchTicketSeqLookup, seqBump] =
      await getFairLaunchTicketSeqLookup(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        //@ts-ignore
        fairLaunchTicketObj.seq,
      );

    await anchorProgram.rpc.createTicketSeq(seqBump, {
      accounts: {
        fairLaunchTicketSeqLookup,
        fairLaunch,
        fairLaunchTicket,
        payer: walletKeyPair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [],
    });

    console.log('Created seq');
  });

program
  .command('mint_from_dummy')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option(
    '-d, --destination <path>',
    `Destination wallet location`,
    '--destination not provided',
  )
  .option('-a, --amount <string>', 'amount')
  .option('-m, --mint <string>', 'mint')
  .action(async (_, cmd) => {
    const { env, keypair, amount, destination, mint } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
    const amountNumber = parseFloat(amount);
    const mintKey = new anchor.web3.PublicKey(mint);
    const dest = new anchor.web3.PublicKey(destination);
    const token = (await getAtaForMint(mintKey, dest))[0];
    const instructions = [];
    const tokenApp = new Token(
      anchorProgram.provider.connection,
      //@ts-ignore
      new anchor.web3.PublicKey(mint),
      TOKEN_PROGRAM_ID,
      walletKeyPair,
    );

    const mintInfo = await tokenApp.getMintInfo();

    const mantissa = 10 ** mintInfo.decimals;
    const assocToken = await anchorProgram.provider.connection.getAccountInfo(
      token,
    );
    if (!assocToken) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          token,
          walletKeyPair.publicKey,
          dest,
          mintKey,
        ),
      );
    }

    instructions.push(
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mintKey,
        token,
        walletKeyPair.publicKey,
        [],
        amountNumber * mantissa,
      ),
    );

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      [],
      'single',
    );
    console.log(`Minted ${amount} to ${token.toBase58()}.`);
  });

program
  .command('create_dummy_payment_mint')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .action(async (_, cmd) => {
    const { env, keypair } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
    const mint = anchor.web3.Keypair.generate();
    const token = (
      await getAtaForMint(mint.publicKey, walletKeyPair.publicKey)
    )[0];
    const instructions: anchor.web3.TransactionInstruction[] = [
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: walletKeyPair.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span,
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        6,
        walletKeyPair.publicKey,
        walletKeyPair.publicKey,
      ),
      createAssociatedTokenAccountInstruction(
        token,
        walletKeyPair.publicKey,
        walletKeyPair.publicKey,
        mint.publicKey,
      ),
    ];

    const signers = [mint];

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      signers,
      'single',
    );
    console.log(`create mint Done: ${mint.publicKey.toBase58()}.`);
  });

async function adjustTicket({
  amountNumber,
  fairLaunchObj,
  adjuster,
  fairLaunch,
  fairLaunchTicket,
  fairLaunchLotteryBitmap,
  anchorProgram,
  payer,
  adjustMantissa,
}: {
  amountNumber: number;
  fairLaunchObj: any;
  payer: anchor.web3.Keypair;
  adjuster: anchor.web3.PublicKey;
  fairLaunch: anchor.web3.PublicKey;
  fairLaunchTicket: anchor.web3.PublicKey;
  fairLaunchLotteryBitmap: anchor.web3.PublicKey;
  anchorProgram: anchor.Program;
  adjustMantissa: boolean;
}) {
  const remainingAccounts = [];
  const instructions = [];
  const signers = [];
  //@ts-ignore
  const tokenAta = fairLaunchObj.treasuryMint
    ? (
        await getAtaForMint(
          //@ts-ignore
          fairLaunchObj.treasuryMint,
          adjuster,
        )
      )[0]
    : undefined;
  //@ts-ignore
  if (!fairLaunchObj.treasuryMint) {
    if (adjustMantissa)
      amountNumber = Math.ceil(amountNumber * LAMPORTS_PER_SOL);
  } else {
    const transferAuthority = anchor.web3.Keypair.generate();
    signers.push(transferAuthority);
    const token = new Token(
      anchorProgram.provider.connection,
      fairLaunchObj.treasuryMint,
      TOKEN_PROGRAM_ID,
      payer,
    );

    const mintInfo = await token.getMintInfo();
    if (adjustMantissa)
      amountNumber = Math.ceil(amountNumber * 10 ** mintInfo.decimals);
    if (amountNumber > 0) {
      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          tokenAta,
          transferAuthority.publicKey,
          adjuster,
          [],
          //@ts-ignore
          amountNumber,
        ),
      );
    }

    remainingAccounts.push({
      //@ts-ignore
      pubkey: fairLaunchObj.treasuryMint,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: tokenAta,
      isWritable: true,
      isSigner: false,
    });
    remainingAccounts.push({
      pubkey: transferAuthority.publicKey,
      isWritable: false,
      isSigner: true,
    });
    remainingAccounts.push({
      pubkey: TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    });
  }

  instructions.push(
    await anchorProgram.instruction.adjustTicket(new anchor.BN(amountNumber), {
      accounts: {
        fairLaunchTicket,
        fairLaunch,
        fairLaunchLotteryBitmap,
        //@ts-ignore
        treasury: fairLaunchObj.treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      //__private: { logAccounts: true },
      remainingAccounts: [
        {
          pubkey: adjuster,
          isSigner: adjuster.equals(payer.publicKey),
          isWritable: true,
        },
        ...remainingAccounts,
      ],
    }),
  );

  //@ts-ignore
  if (fairLaunchObj.treasuryMint && amountNumber > 0) {
    instructions.push(
      Token.createRevokeInstruction(
        FAIR_LAUNCH_PROGRAM_ID,
        tokenAta,
        payer.publicKey,
        [],
      ),
    );
  }

  await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    payer,
    instructions,
    signers,
    'single',
  );

  console.log(
    `update fair launch ticket Done: ${fairLaunchTicket.toBase58()}.`,
  );
}

program
  .command('update_participation_nft')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-n, --name <string>', 'name')
  .option('-s, --symbol <string>', 'symbol')
  .option('-u, --uri <string>', 'uri')
  .option(
    '-sfbp, --seller-fee-basis-points <string>',
    'seller fee basis points',
  )
  .option(
    '-m, --participation-modulo <string>',
    '1 if everybody gets it, 4 if only 1 in 4 get it, etc',
  )
  .option(
    '-c, --creators <string>',
    'comma separated creator wallets like wallet1,73,true,wallet2,27,false where its wallet, then share, then verified true/false',
  )
  .option('-nm, --is_not_mutable', 'is not mutable')
  .action(async (_, cmd) => {
    const {
      env,
      keypair,
      fairLaunch,
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      isNotMutable,
      participationModulo,
    } = cmd.opts();
    const sellerFeeBasisPointsNumber = parseInt(sellerFeeBasisPoints);
    const participationModuloNumber = parseInt(participationModulo);

    const creatorsListPre = creators ? creators.split(',') : [];
    const creatorsList = [];
    for (let i = 0; i < creatorsListPre.length; i += 3) {
      creatorsList.push({
        address: new anchor.web3.PublicKey(creatorsListPre[i]),
        share: parseInt(creatorsListPre[i + 1]),
        verified: creatorsListPre[i + 2] == 'true' ? true : false,
      });
    }
    const isMutableBool = isNotMutable ? false : true;
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const participationMint = (
      await getParticipationMint(
        //@ts-ignore
        fairLaunchObj.authority,
        //@ts-ignore
        fairLaunchObj.data.uuid,
      )
    )[0];

    await anchorProgram.rpc.updateParticipationNft(
      participationModuloNumber,
      {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: sellerFeeBasisPointsNumber,
        creators: creatorsList,
        isMutable: isMutableBool,
      },
      {
        accounts: {
          fairLaunch: fairLaunchKey,
          authority: walletKeyPair.publicKey,
          //@ts-ignore
          metadata: await getMetadata(participationMint),
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        },
      },
    );

    console.log('Update participation metadata.');
  });

program
  .command('set_participation_nft')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-n, --name <string>', 'name')
  .option('-s, --symbol <string>', 'symbol')
  .option('-u, --uri <string>', 'uri')
  .option(
    '-sfbp, --seller-fee-basis-points <string>',
    'seller fee basis points',
  )
  .option(
    '-m, --participation-modulo <string>',
    '1 if everybody gets it, 4 if only 1 in 4 get it, etc',
  )
  .option(
    '-c, --creators <string>',
    'comma separated creator wallets like wallet1,73,true,wallet2,27,false where its wallet, then share, then verified true/false',
  )
  .option('-nm, --is_not_mutable', 'is not mutable')
  .action(async (_, cmd) => {
    const {
      env,
      keypair,
      fairLaunch,
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      isNotMutable,
      participationModulo,
    } = cmd.opts();
    const sellerFeeBasisPointsNumber = parseInt(sellerFeeBasisPoints);
    const participationModuloNumber = parseInt(participationModulo);

    const creatorsListPre = creators ? creators.split(',') : [];
    const creatorsList = [];
    for (let i = 0; i < creatorsListPre.length; i += 3) {
      creatorsList.push({
        address: new anchor.web3.PublicKey(creatorsListPre[i]),
        share: parseInt(creatorsListPre[i + 1]),
        verified: creatorsListPre[i + 2] == 'true' ? true : false,
      });
    }
    const isMutableBool = isNotMutable ? false : true;
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const [participationMint, mintBump] = await getParticipationMint(
      //@ts-ignore
      fairLaunchObj.authority,
      //@ts-ignore
      fairLaunchObj.data.uuid,
    );
    const [participationTokenAccount, tokenBump] = await getParticipationToken(
      //@ts-ignore
      fairLaunchObj.authority,
      //@ts-ignore
      fairLaunchObj.data.uuid,
    );

    await anchorProgram.rpc.setParticipationNft(
      mintBump,
      tokenBump,
      participationModuloNumber,
      {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: sellerFeeBasisPointsNumber,
        creators: creatorsList,
        isMutable: isMutableBool,
      },
      {
        accounts: {
          fairLaunch: fairLaunchKey,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          participationMint,
          participationTokenAccount,
          //@ts-ignore
          metadata: await getMetadata(participationMint),
          //@ts-ignore
          masterEdition: await getMasterEdition(participationMint),
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      },
    );

    console.log('Set participation metadata.');
  });

program
  .command('set_token_metadata')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-n, --name <string>', 'name')
  .option('-s, --symbol <string>', 'symbol')
  .option('-u, --uri <string>', 'uri')
  .option(
    '-sfbp, --seller-fee-basis-points <string>',
    'seller fee basis points',
  )
  .option(
    '-c, --creators <string>',
    'comma separated creator wallets like wallet1,73,true,wallet2,27,false where its wallet, then share, then verified true/false',
  )
  .option('-nm, --is_not_mutable', 'is not mutable')
  .action(async (_, cmd) => {
    const {
      env,
      keypair,
      fairLaunch,
      name,
      symbol,
      uri,
      sellerFeeBasisPoints,
      creators,
      isNotMutable,
    } = cmd.opts();
    const sellerFeeBasisPointsNumber = parseInt(sellerFeeBasisPoints);

    const creatorsListPre = creators ? creators.split(',') : [];
    const creatorsList = [];
    for (let i = 0; i < creatorsListPre.length; i += 3) {
      creatorsList.push({
        address: new anchor.web3.PublicKey(creatorsListPre[i]),
        share: parseInt(creatorsListPre[i + 1]),
        verified: creatorsListPre[i + 2] == 'true' ? true : false,
      });
    }
    const isMutableBool = isNotMutable ? false : true;
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    await anchorProgram.rpc.setTokenMetadata(
      {
        name,
        symbol,
        uri,
        sellerFeeBasisPoints: sellerFeeBasisPointsNumber,
        creators: creatorsList,
        isMutable: isMutableBool,
      },
      {
        accounts: {
          fairLaunch: fairLaunchKey,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          //@ts-ignore
          metadata: await getMetadata(fairLaunchObj.tokenMint),
          //@ts-ignore
          tokenMint: fairLaunchObj.tokenMint,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      },
    );

    console.log('Set token metadata.');
  });

program
  .command('adjust_ticket')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-a, --amount <string>', 'amount')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, amount } = cmd.opts();
    const amountNumber = parseFloat(amount);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );
    const fairLaunchTicket = (
      await getFairLaunchTicket(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
      )
    )[0];

    const fairLaunchLotteryBitmap = ( //@ts-ignore
      await getFairLaunchLotteryBitmap(fairLaunchObj.tokenMint)
    )[0];

    await adjustTicket({
      amountNumber,
      fairLaunchObj,
      adjuster: walletKeyPair.publicKey,
      fairLaunch,
      fairLaunchTicket,
      fairLaunchLotteryBitmap,
      anchorProgram,
      payer: walletKeyPair,
      adjustMantissa: true,
    });
  });

program
  .command('punch_and_refund_all_outstanding')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, rpcUrl } = cmd.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const fairLaunchLotteryBitmap = (
      await getFairLaunchLotteryBitmap(
        //@ts-ignore
        fairLaunchObj.tokenMint,
      )
    )[0];

    const fairLaunchLotteryBitmapObj =
      await anchorProgram.provider.connection.getAccountInfo(
        fairLaunchLotteryBitmap,
      );

    const seqKeys = [];
    //@ts-ignore
    for (let i = 0; i < fairLaunchObj.numberTicketsSold; i++) {
      seqKeys.push(
        (
          await getFairLaunchTicketSeqLookup(
            //@ts-ignore
            fairLaunchObj.tokenMint,
            new anchor.BN(i),
          )
        )[0],
      );
    }

    const ticketKeys: any[][] = await Promise.all(
      chunks(Array.from(Array(seqKeys.length).keys()), 1000).map(
        async allIndexesInSlice => {
          let ticketKeys = [];
          for (let i = 0; i < allIndexesInSlice.length; i += 100) {
            console.log(
              'Pulling ticket seqs for slice',
              allIndexesInSlice[i],
              allIndexesInSlice[i + 100],
            );
            const slice = allIndexesInSlice
              .slice(i, i + 100)
              .map(index => seqKeys[index]);
            let result;
            let tries = 0;
            let done = false;
            while (tries < 3 && !done) {
              try {
                result = await getMultipleAccounts(
                  anchorProgram.provider.connection,
                  slice.map(s => s.toBase58()),
                  'recent',
                );
                done = true;
              } catch (e) {
                console.log(e);
                console.log('Failed, retrying after 10s sleep');
                await sleep(10000);
                tries += 1;
              }
            }
            ticketKeys = ticketKeys.concat(
              result.array.map(
                a =>
                  new anchor.web3.PublicKey(
                    new Uint8Array(a.data.slice(8, 8 + 32)),
                  ),
              ),
            );
          }
          return ticketKeys;
        },
      ),
    );

    const ticketsFlattened = ticketKeys.flat();

    const ticketData: { key: anchor.web3.PublicKey; model: any }[][] =
      await Promise.all(
        chunks(Array.from(Array(ticketsFlattened.length).keys()), 1000).map(
          async allIndexesInSlice => {
            let states = [];
            for (let i = 0; i < allIndexesInSlice.length; i += 100) {
              console.log(
                'Pulling accounts for slice',
                allIndexesInSlice[i],
                allIndexesInSlice[i + 100],
              );
              const slice = allIndexesInSlice
                .slice(i, i + 100)
                .map(index => ticketsFlattened[index]);

              let result;
              let tries = 0;
              let done = false;
              while (tries < 3 && !done) {
                try {
                  result = await getMultipleAccounts(
                    anchorProgram.provider.connection,
                    slice.map(s => s.toBase58()),
                    'recent',
                  );
                  done = true;
                } catch (e) {
                  console.log(e);
                  console.log('Failed, retrying after 10s sleep');
                  await sleep(10000);
                  tries += 1;
                }
              }
              states = states.concat(
                result.array.map((a, i) => ({
                  key: new anchor.web3.PublicKey(result.keys[i]),
                  model: anchorProgram.coder.accounts.decode(
                    'FairLaunchTicket',
                    a.data,
                  ),
                })),
              );
            }
            return states;
          },
        ),
      );

    const ticketDataFlat = ticketData.flat();

    await Promise.all(
      chunks(Array.from(Array(ticketDataFlat.length).keys()), 1000).map(
        async allIndexesInSlice => {
          for (let i = 0; i < allIndexesInSlice.length; i++) {
            const ticket = ticketDataFlat[allIndexesInSlice[i]];
            if (!ticket.model.gottenParticipation) {
              let tries = 0;
              let done = false;
              while (tries < 3 && !done) {
                try {
                  const nft = await getParticipationNft({
                    payer: walletKeyPair,
                    buyer: ticket.model.buyer,
                    anchorProgram,
                    fairLaunchTicket: ticket.key,
                    fairLaunch,
                    fairLaunchObj,
                    fairLaunchTicketObj: ticket.model,
                  });
                  done = true;
                  if (nft) {
                    console.log(
                      `Got participation nft and placed token in new account ${nft.toBase58()}.`,
                    );
                  }
                } catch (e) {
                  if (tries > 3) {
                    throw e;
                  } else {
                    tries++;
                  }
                  console.log(e);
                  console.log(
                    'Ticket failed to get participation nft, trying one more time',
                  );
                  await sleep(1000);
                }
              }
            } else {
              console.log(
                'Ticket',
                ticket.model.buyer.toBase58(),
                'already received participation',
              );
            }
            if (ticket.model.state.unpunched) {
              if (
                ticket.model.amount.toNumber() <
                //@ts-ignore
                fairLaunchObj.currentMedian.toNumber()
              ) {
                console.log(
                  'Refunding ticket for buyer',
                  allIndexesInSlice[i],
                  ticket.model.buyer.toBase58(),
                );
                let tries = 0;
                let done = false;
                while (tries < 3 && !done) {
                  try {
                    await adjustTicket({
                      amountNumber: 0,
                      fairLaunchObj,
                      adjuster: ticket.model.buyer,
                      fairLaunch,
                      fairLaunchTicket: ticket.key,
                      fairLaunchLotteryBitmap,
                      anchorProgram,
                      payer: walletKeyPair,
                      adjustMantissa: true,
                    });
                    done = true;
                  } catch (e) {
                    if (tries > 3) {
                      throw e;
                    } else {
                      tries++;
                    }
                    console.log(e);
                    console.log(
                      'Adjusting ticket failed',
                      ticket.key.toBase58(),
                    );
                    await sleep(1000);
                  }
                }
              } else {
                const myByte =
                  fairLaunchLotteryBitmapObj.data[
                    FAIR_LAUNCH_LOTTERY_SIZE +
                      Math.floor(ticket.model.seq.toNumber() / 8)
                  ];

                const positionFromRight = 7 - (ticket.model.seq.toNumber() % 8);
                const mask = Math.pow(2, positionFromRight);
                const isWinner = myByte & mask;
                if (isWinner > 0) {
                  console.log(
                    'Punching ticket for buyer',
                    allIndexesInSlice[i],
                    ticket.model.buyer.toBase58(),
                  );
                  const diff =
                    ticket.model.amount.toNumber() -
                    //@ts-ignore
                    fairLaunchObj.currentMedian.toNumber();
                  if (diff > 0) {
                    console.log(
                      'Refunding first',
                      diff,
                      'to buyer',
                      allIndexesInSlice[i],
                      'before punching',
                    );
                    let tries = 0;
                    let done = false;
                    while (tries < 3 && !done) {
                      try {
                        await adjustTicket({
                          //@ts-ignore
                          amountNumber: fairLaunchObj.currentMedian.toNumber(),
                          fairLaunchObj,
                          adjuster: ticket.model.buyer,
                          fairLaunch,
                          fairLaunchTicket: ticket.key,
                          fairLaunchLotteryBitmap,
                          anchorProgram,
                          payer: walletKeyPair,
                          adjustMantissa: false,
                        });
                        done = true;
                        console.log(
                          'Adjusting ticket succeeded',
                          ticket.key.toBase58(),
                        );
                      } catch (e) {
                        if (tries > 3) {
                          throw e;
                        } else {
                          tries++;
                        }
                        console.log(e);
                        console.log(
                          'Adjusting ticket failed',
                          ticket.key.toBase58(),
                        );
                        await sleep(1000);
                      }
                    }
                  }
                  let tries = 0;
                  let done = false;
                  while (tries < 3 && !done) {
                    try {
                      const buyerTokenAccount = await punchTicket({
                        payer: walletKeyPair,
                        puncher: ticket.model.buyer,
                        anchorProgram,
                        fairLaunchTicket: ticket.key,
                        fairLaunch,
                        fairLaunchLotteryBitmap,
                        fairLaunchObj,
                        fairLaunchTicketObj: ticket.model,
                      });
                      done = true;
                      console.log(
                        `Punched ticket and placed token in new account ${buyerTokenAccount.toBase58()}.`,
                      );
                    } catch (e) {
                      if (tries > 3) {
                        throw e;
                      } else {
                        tries++;
                      }
                      console.log(e);
                      console.log(
                        'Ticket failed to punch, trying one more time',
                      );
                      await sleep(1000);
                    }
                  }
                } else {
                  console.log(
                    'Buyer ',
                    allIndexesInSlice[i],
                    ticket.model.buyer.toBase58(),
                    'was eligible but lost lottery, refunding',
                  );
                  let tries = 0;
                  let done = false;
                  while (tries < 3 && !done) {
                    try {
                      await adjustTicket({
                        //@ts-ignore
                        amountNumber: 0,
                        fairLaunchObj,
                        adjuster: ticket.model.buyer,
                        fairLaunch,
                        fairLaunchTicket: ticket.key,
                        fairLaunchLotteryBitmap,
                        anchorProgram,
                        payer: walletKeyPair,
                        adjustMantissa: true,
                      });
                      done = true;
                      console.log(
                        'Refunding  ticket succeeded',
                        ticket.key.toBase58(),
                      );
                    } catch (e) {
                      if (tries > 3) {
                        throw e;
                      } else {
                        tries++;
                      }
                      console.log(e);
                      console.log(
                        'Adjusting ticket failed',
                        ticket.key.toBase58(),
                      );
                      await sleep(1000);
                    }
                  }
                  console.log('Refunded.');
                }
              }
            } else if (ticket.model.state.withdrawn) {
              console.log(
                'Buyer',
                allIndexesInSlice[i],
                ticket.model.buyer.toBase58(),
                'withdrawn already',
              );
            } else if (ticket.model.state.punched) {
              console.log(
                'Buyer',
                allIndexesInSlice[i],
                ticket.model.buyer.toBase58(),
                'punched already',
              );
            }
          }
        },
      ),
    );
  });

async function getParticipationNft({
  buyer,
  payer,
  anchorProgram,
  fairLaunchTicket,
  fairLaunch,
  fairLaunchObj,
  fairLaunchTicketObj,
}: {
  buyer: anchor.web3.PublicKey;
  anchorProgram: anchor.Program;
  payer: anchor.web3.Keypair;
  fairLaunchTicket: anchor.web3.PublicKey;
  fairLaunch: anchor.web3.PublicKey;
  fairLaunchObj: any;
  fairLaunchTicketObj: any;
}): Promise<anchor.web3.PublicKey | null> {
  if (
    fairLaunchObj.participationMint &&
    fairLaunchTicketObj.seq.toNumber() % fairLaunchObj.participationModulo == 0
  ) {
    console.log(buyer.toBase58(), 'gets participation token.');
    const mint = anchor.web3.Keypair.generate();
    const signers = [mint];
    const tokenAccount = (
      await getParticipationToken(
        fairLaunchObj.authority,
        fairLaunchObj.data.uuid,
      )
    )[0];
    const buyerTokenNft = (await getAtaForMint(mint.publicKey, buyer))[0];
    const instructions = [
      anchor.web3.SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span,
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        payer.publicKey,
        payer.publicKey,
      ),
      createAssociatedTokenAccountInstruction(
        buyerTokenNft,
        payer.publicKey,
        buyer,
        mint.publicKey,
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        buyerTokenNft,
        payer.publicKey,
        [],
        1,
      ),
    ];
    await anchorProgram.rpc.mintParticipationNft({
      accounts: {
        fairLaunch,
        fairLaunchTicket,
        payer: payer.publicKey,
        participationMint: fairLaunchObj.participationMint,
        participationTokenAccount: tokenAccount,
        buyer,
        buyerNftTokenAccount: buyerTokenNft,
        newMetadata: await getMetadata(mint.publicKey),
        newEdition: await getMasterEdition(mint.publicKey),
        newMint: mint.publicKey,
        newMintAuthority: payer.publicKey,
        metadata: await getMetadata(fairLaunchObj.participationMint),
        masterEdition: await getMasterEdition(fairLaunchObj.participationMint),
        editionMarkPda: await getEditionMarkPda(
          fairLaunchObj.participationMint,
          fairLaunchTicketObj.seq.toNumber(),
        ),
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      instructions,
      signers,
    });
    return buyerTokenNft;
  } else {
    console.log(buyer.toBase58(), 'doesnt get participation token.');
    return null;
  }
}

async function punchTicket({
  puncher,
  payer,
  anchorProgram,
  fairLaunchTicket,
  fairLaunch,
  fairLaunchLotteryBitmap,
  fairLaunchObj,
}: {
  puncher: anchor.web3.PublicKey;
  anchorProgram: anchor.Program;
  payer: anchor.web3.Keypair;
  fairLaunchTicket: anchor.web3.PublicKey;
  fairLaunch: anchor.web3.PublicKey;
  fairLaunchLotteryBitmap: anchor.web3.PublicKey;
  fairLaunchObj: any;
  fairLaunchTicketObj: any;
}): Promise<anchor.web3.PublicKey> {
  const buyerTokenAccount = (
    await getAtaForMint(
      //@ts-ignore
      fairLaunchObj.tokenMint,
      puncher,
    )
  )[0];

  const exists = await anchorProgram.provider.connection.getAccountInfo(
    buyerTokenAccount,
  );

  await anchorProgram.rpc.punchTicket({
    accounts: {
      fairLaunchTicket,
      fairLaunch,
      fairLaunchLotteryBitmap,
      payer: payer.publicKey,
      buyerTokenAccount,
      //@ts-ignore
      tokenMint: fairLaunchObj.tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    options: {
      commitment: 'single',
    },
    //__private: { logAccounts: true },
    instructions: !exists
      ? [
          createAssociatedTokenAccountInstruction(
            buyerTokenAccount,
            payer.publicKey,
            puncher,
            //@ts-ignore
            fairLaunchObj.tokenMint,
          ),
        ]
      : undefined,
  });

  return buyerTokenAccount;
}
program
  .command('punch_ticket')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const fairLaunchTicket = (
      await getFairLaunchTicket(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
      )
    )[0];

    const fairLaunchLotteryBitmap = ( //@ts-ignore
      await getFairLaunchLotteryBitmap(fairLaunchObj.tokenMint)
    )[0];

    const ticket = await anchorProgram.account.fairLaunchTicket.fetch(
      fairLaunchTicket,
    );

    const diff =
      //@ts-ignore
      ticket.amount.toNumber() -
      //@ts-ignore
      fairLaunchObj.currentMedian.toNumber();
    if (diff > 0) {
      console.log('Refunding first', diff, 'to buyer before punching');
      await adjustTicket({
        //@ts-ignore
        amountNumber: fairLaunchObj.currentMedian.toNumber(),
        fairLaunchObj,
        //@ts-ignore
        adjuster: ticket.buyer,
        fairLaunch,
        fairLaunchTicket,
        fairLaunchLotteryBitmap,
        anchorProgram,
        payer: walletKeyPair,
        adjustMantissa: false,
      });
    }

    let tries = 0;
    let done = false;
    //@ts-ignore
    if (!ticket.gottenParticipation) {
      while (tries < 3 && !done) {
        try {
          const nft = await getParticipationNft({
            buyer: walletKeyPair.publicKey,
            payer: walletKeyPair,
            anchorProgram,
            fairLaunchTicket,
            fairLaunch,
            fairLaunchObj,
            fairLaunchTicketObj: ticket,
          });
          done = true;

          if (nft) {
            console.log(
              `Punched participation NFT and placed token in new account ${nft.toBase58()}.`,
            );
          }
        } catch (e) {
          if (tries > 3) {
            throw e;
          } else {
            tries++;
          }
          console.log('Ticket failed to punch, trying one more time');
          await sleep(1000);
        }
      }
    } else {
      console.log('Already got participation');
    }

    tries = 0;
    done = false;
    while (tries < 3 && !done) {
      try {
        const buyerTokenAccount = await punchTicket({
          puncher: walletKeyPair.publicKey,
          payer: walletKeyPair,
          anchorProgram,
          fairLaunchTicket,
          fairLaunch,
          fairLaunchLotteryBitmap,
          fairLaunchObj,
          fairLaunchTicketObj: ticket,
        });
        done = true;
        console.log(
          `Punched ticket and placed token in new account ${buyerTokenAccount.toBase58()}.`,
        );
      } catch (e) {
        if (tries > 3) {
          throw e;
        } else {
          tries++;
        }
        console.log('Ticket failed to punch, trying one more time');
        await sleep(1000);
      }
    }
  });

program
  .command('burn_fair_launch_tokens_warning_irreversible')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-n, --number <string>', 'number to burn')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, number } = cmd.opts();

    const actual = parseInt(number);
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const myTokenAccount = (
      await getAtaForMint(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
      )
    )[0];

    const instructions = [
      Token.createBurnInstruction(
        TOKEN_PROGRAM_ID,
        //@ts-ignore
        fairLaunchObj.tokenMint,
        myTokenAccount,
        walletKeyPair.publicKey,
        [],
        actual,
      ),
    ];

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      [],
      'single',
    );

    console.log(
      `Burned ${actual} tokens in account ${myTokenAccount.toBase58()}.`,
    );
  });

program
  .command('start_phase_three')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );
    const fairLaunchLotteryBitmap = ( //@ts-ignore
      await getFairLaunchLotteryBitmap(fairLaunchObj.tokenMint)
    )[0];

    await anchorProgram.rpc.startPhaseThree({
      accounts: {
        fairLaunch,
        fairLaunchLotteryBitmap,
        authority: walletKeyPair.publicKey,
        //@ts-ignore
        tokenMint: fairLaunchObj.tokenMint,
      },
    });

    console.log(`Dang son, phase three.`);
  });

program
  .command('mint_flp_tokens')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-a, --amount <string>', 'amount')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, amount } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const amountNumber = parseInt(amount);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );
    const tokenAccount = ( //@ts-ignore
      await getAtaForMint(fairLaunchObj.tokenMint, walletKeyPair.publicKey)
    )[0];

    const exists = await anchorProgram.provider.connection.getAccountInfo(
      tokenAccount,
    );

    const instructions = [];
    if (!exists) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          tokenAccount,
          walletKeyPair.publicKey,
          walletKeyPair.publicKey,
          //@ts-ignore
          fairLaunchObj.tokenMint,
        ),
      );
    }

    await anchorProgram.rpc.mintTokens(new anchor.BN(amountNumber), {
      accounts: {
        fairLaunch: fairLaunchKey,
        authority: walletKeyPair.publicKey,
        //@ts-ignore
        tokenMint: fairLaunchObj.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenAccount,
      },
      instructions: instructions.length ? instructions : undefined,
    });

    console.log(`Added ${amountNumber} tokens to ${tokenAccount.toBase58()}`);
  });

program
  .command('send_flp_tokens')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-l, --file <string>', 'file containing \n delimited wallets')
  .option('-sc, --startCursor <string>', 'start cursor (incl)')
  .option('-ec, --endCursor <string>', 'end cursor (excl)')

  .option(
    '-ut, --upper-tolerance <string>',
    'if a wallet has more than tolerance tokens going to it(>), skip the wallet (assuming a secondary)',
  )
  .option(
    '-lt, --lower-tolerance <string>',
    'if a wallet has less than tolerance tokens going to it(<)',
  )
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )

  .action(async (_, cmd) => {
    const {
      env,
      keypair,
      fairLaunch,
      file,
      upperTolerance,
      lowerTolerance,
      startCursor,
      endCursor,
      rpcUrl,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const upTol = parseInt(upperTolerance);
    const lowTol = parseInt(lowerTolerance);
    const startC = startCursor ? parseInt(startCursor) : 0;

    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );
    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const array = fs.readFileSync(file).toString().split('\n');
    const endC = endCursor ? parseInt(endCursor) : array.length;
    const byCount = {};
    // use entire array for counts, despite cursor settings.
    for (let i = 0; i < array.length; i++) {
      if (byCount[array[i]] === undefined) {
        byCount[array[i]] = 0;
      }
      byCount[array[i]]++;
    }

    const currSignerBatch: Array<anchor.web3.Keypair[]> = [];
    const currInstrBatch: Array<anchor.web3.TransactionInstruction[]> = [];

    let sendSigners: anchor.web3.Keypair[] = [];
    let sendInstr: anchor.web3.TransactionInstruction[] = [];

    const ataSignerBatch: Array<anchor.web3.Keypair[]> = [];
    const ataInstrBatch: Array<anchor.web3.TransactionInstruction[]> = [];

    let ataSigners: anchor.web3.Keypair[] = [];
    let ataInstr: anchor.web3.TransactionInstruction[] = [];

    const txnSize = 10;
    let cursor = startC;

    const lookup = {};
    try {
      for (; cursor < Math.min(array.length, endC); cursor++) {
        const currKey = array[cursor];
        const currCount = byCount[currKey];
        if (currKey.length > 2) {
          if (currCount < lowTol || currCount > upTol) {
            console.log(
              'Skipped',
              currKey,
              'due to having',
              currCount,
              'allocations.',
            );
          } else {
            const existingAta = (
              await getAtaForMint(
                fairLaunchObj.tokenMint,
                new anchor.web3.PublicKey(currKey),
              )
            )[0];
            let exists = lookup[existingAta.toBase58()];
            if (!exists) {
              exists =
                !!(await anchorProgram.provider.connection.getAccountInfo(
                  existingAta,
                ));
            }
            if (!exists) {
              ataInstr.push(
                createAssociatedTokenAccountInstruction(
                  existingAta,
                  walletKeyPair.publicKey,
                  new anchor.web3.PublicKey(currKey),
                  //@ts-ignore
                  fairLaunchObj.tokenMint,
                ),
              );

              lookup[existingAta.toBase58()] = true;
            }
          }
        }
        if (ataInstr.length === txnSize) {
          ataSignerBatch.push(ataSigners);
          ataInstrBatch.push(ataInstr);
          ataSigners = [];
          ataInstr = [];
        }
      }

      if (ataInstr.length < txnSize && ataInstr.length > 0) {
        ataSignerBatch.push(ataSigners);
        ataInstrBatch.push(ataInstr);
      }
    } catch (e) {
      console.log('Failed on cursor', cursor);
      throw e;
    }

    cursor = startC;
    const myAta = (
      await getAtaForMint(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
      )
    )[0];
    try {
      // do 1 at a time so if blow up happens, you can restart at exploded cursor.
      // less efficient but better guarantees on not over-sending.
      for (; cursor < Math.min(array.length, endC); cursor++) {
        const currKey = array[cursor];
        const currCount = byCount[currKey];
        if (currKey.length > 2) {
          if (currCount < lowTol || currCount > upTol) {
            console.log(
              'Skipped',
              currKey,
              'due to having',
              currCount,
              'allocations.',
            );
          } else {
            const existingAta = (
              await getAtaForMint(
                fairLaunchObj.tokenMint,
                new anchor.web3.PublicKey(currKey),
              )
            )[0];

            sendInstr.push(
              Token.createTransferInstruction(
                TOKEN_PROGRAM_ID,
                myAta,
                existingAta,
                walletKeyPair.publicKey,
                [],
                1,
              ),
            );
          }
        }

        if (sendInstr.length === txnSize) {
          currSignerBatch.push(sendSigners);
          currInstrBatch.push(sendInstr);
          sendSigners = [];
          sendInstr = [];
        }
      }

      if (sendInstr.length < txnSize && sendInstr.length > 0) {
        currSignerBatch.push(sendSigners);
        currInstrBatch.push(sendInstr);
      }
    } catch (e) {
      console.log('Failed on cursor', cursor);
      throw e;
    }

    let txnCursor = startC;
    try {
      for (let i = 0; i < ataInstrBatch.length; i++) {
        const instructionBatch = ataInstrBatch[i];
        const signerBatch = ataSignerBatch[i];
        await sendTransactionWithRetryWithKeypair(
          anchorProgram.provider.connection,
          walletKeyPair,
          instructionBatch,
          signerBatch,
          'single',
        );
        txnCursor += txnSize;
      }
    } catch (e) {
      console.log('ATA account creation Failed on cursor', txnCursor);
      throw e;
    }
    // Give time for last confirmation
    await sleep(10000);
    txnCursor = startC;
    try {
      for (let i = 0; i < currInstrBatch.length; i++) {
        const instructionBatch = currInstrBatch[i];
        const signerBatch = currSignerBatch[i];
        await sendTransactionWithRetryWithKeypair(
          anchorProgram.provider.connection,
          walletKeyPair,
          instructionBatch,
          signerBatch,
          'single',
        );
        txnCursor += txnSize;
      }
    } catch (e) {
      console.log('Failed on cursor', txnCursor);
      throw e;
    }
  });

program
  .command('withdraw_funds')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const remainingAccounts = [];

    //@ts-ignore
    if (fairLaunchObj.treasuryMint) {
      remainingAccounts.push({
        //@ts-ignore
        pubkey: fairLaunchObj.treasuryMint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: (
          await getAtaForMint(
            //@ts-ignore
            fairLaunchObj.treasuryMint,
            walletKeyPair.publicKey,
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: TOKEN_PROGRAM_ID,
        isWritable: false,
        isSigner: false,
      });
    }

    await anchorProgram.rpc.withdrawFunds({
      accounts: {
        fairLaunch,
        // @ts-ignore
        treasury: fairLaunchObj.treasury,
        authority: walletKeyPair.publicKey,
        // @ts-ignore
        tokenMint: fairLaunchObj.tokenMint,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      remainingAccounts,
    });

    console.log(`Now you rich, give me some.`);
  });

program
  .command('restart_phase_2')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    await anchorProgram.rpc.restartPhaseTwo({
      accounts: {
        fairLaunch,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
    });

    console.log(`Clock restart on phase 2`);
  });

program
  .command('receive_refund')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const buyerTokenAccount = (
      await getAtaForMint(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
      )
    )[0];

    const transferAuthority = anchor.web3.Keypair.generate();

    const signers = [transferAuthority];
    const instructions = [
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        //@ts-ignore
        buyerTokenAccount,
        transferAuthority.publicKey,
        walletKeyPair.publicKey,
        [],
        //@ts-ignore
        1,
      ),
    ];

    const remainingAccounts = [];

    //@ts-ignore
    if (fairLaunchObj.treasuryMint) {
      remainingAccounts.push({
        //@ts-ignore
        pubkey: fairLaunchObj.treasuryMint,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: (
          await getAtaForMint(
            //@ts-ignore
            fairLaunchObj.treasuryMint,
            walletKeyPair.publicKey,
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });
    }

    const txid = await anchorProgram.rpc.receiveRefund({
      accounts: {
        fairLaunch,
        // @ts-ignore
        treasury: fairLaunchObj.treasury,
        buyer: walletKeyPair.publicKey,
        buyerTokenAccount,
        transferAuthority: transferAuthority.publicKey,
        // @ts-ignore
        tokenMint: fairLaunchObj.tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      },
      remainingAccounts,
      instructions,
      signers,
    });

    console.log(`You received a refund, traitor. ${txid}`);
  });

program
  .command('create_fair_launch_lottery')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .option('-w, --whitelist-json <path>', `Whitelist json location`)
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, rpcUrl, whitelistJson } = cmd.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );

    const whitelist: string[] | null = whitelistJson
      ? JSON.parse(fs.readFileSync(whitelistJson).toString())
      : null;

    const fairLaunchKey = new anchor.web3.PublicKey(fairLaunch);
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunchKey,
    );

    const [fairLaunchLotteryBitmap, bump] = await getFairLaunchLotteryBitmap(
      //@ts-ignore
      fairLaunchObj.tokenMint,
    );

    const exists = await anchorProgram.provider.connection.getAccountInfo(
      fairLaunchLotteryBitmap,
    );

    if (!exists) {
      await anchorProgram.rpc.createFairLaunchLotteryBitmap(bump, {
        accounts: {
          fairLaunch,
          fairLaunchLotteryBitmap,
          authority: walletKeyPair.publicKey,
          payer: walletKeyPair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        },
      });

      console.log(
        `created fair launch lottery bitmap Done: ${fairLaunchLotteryBitmap.toBase58()}.`,
      );
    } else {
      console.log(
        `checked fair launch lottery bitmap, exists: ${fairLaunchLotteryBitmap.toBase58()}.`,
      );
    }

    const seqKeys = [];
    //@ts-ignore
    for (let i = 0; i < fairLaunchObj.numberTicketsSold; i++) {
      seqKeys.push(
        (
          await getFairLaunchTicketSeqLookup(
            //@ts-ignore
            fairLaunchObj.tokenMint,
            new anchor.BN(i),
          )
        )[0],
      );
    }

    const ticketKeys: anchor.web3.PublicKey[][] = await Promise.all(
      chunks(Array.from(Array(seqKeys.length).keys()), 1000).map(
        async allIndexesInSlice => {
          let ticketKeys = [];
          for (let i = 0; i < allIndexesInSlice.length; i += 100) {
            console.log(
              'Pulling ticket seqs for slice',
              allIndexesInSlice[i],
              allIndexesInSlice[i + 100],
            );
            const slice = allIndexesInSlice
              .slice(i, i + 100)
              .map(index => seqKeys[index]);
            const result = await getMultipleAccounts(
              anchorProgram.provider.connection,
              slice.map(s => s.toBase58()),
              'recent',
            );
            ticketKeys = ticketKeys.concat(
              result.array.map(
                a =>
                  new anchor.web3.PublicKey(
                    new Uint8Array(a.data.slice(8, 8 + 32)),
                  ),
              ),
            );
          }

          return ticketKeys;
        },
      ),
    );

    const ticketsFlattened = ticketKeys.flat();

    const states: {
      seq: number;
      number: anchor.BN;
      eligible: boolean;
      whitelisted: boolean;
    }[][] = await Promise.all(
      chunks(Array.from(Array(ticketsFlattened.length).keys()), 1000).map(
        async allIndexesInSlice => {
          let states = [];
          for (let i = 0; i < allIndexesInSlice.length; i += 100) {
            console.log(
              'Pulling states for slice',
              allIndexesInSlice[i],
              allIndexesInSlice[i + 100],
            );
            const slice = allIndexesInSlice
              .slice(i, i + 100)
              .map(index => ticketsFlattened[index]);
            const result = await getMultipleAccounts(
              anchorProgram.provider.connection,
              slice.map(s => s.toBase58()),
              'recent',
            );
            states = states.concat(
              result.array.map(a => {
                const el = anchorProgram.coder.accounts.decode(
                  'FairLaunchTicket',
                  a.data,
                );
                return {
                  seq: el.seq.toNumber(),
                  number: el.amount.toNumber(),
                  eligible: !!(
                    el.state.unpunched &&
                    el.amount.toNumber() >=
                      //@ts-ignore
                      fairLaunchObj.currentMedian.toNumber()
                  ),
                  whitelisted: whitelist?.includes(el.buyer.toBase58()),
                };
              }),
            );
          }

          return states;
        },
      ),
    );

    const statesFlat = states.flat();
    const token = new Token(
      anchorProgram.provider.connection,
      //@ts-ignore
      new anchor.web3.PublicKey(fairLaunchObj.tokenMint),
      TOKEN_PROGRAM_ID,
      walletKeyPair,
    );

    const mintInfo = await token.getMintInfo();

    let numWinnersRemaining = Math.min(
      //@ts-ignore;
      fairLaunchObj.data.numberOfTokens.sub(mintInfo.supply),
      //@ts-ignore;
      statesFlat.filter(s => s.eligible).length,
    );

    let chosen: {
      seq: number;
      eligible: boolean;
      chosen: boolean;
      whitelisted: boolean;
    }[];
    if (numWinnersRemaining >= statesFlat.length) {
      console.log('More or equal nfts than winners, everybody wins.');
      chosen = statesFlat.map(s => ({ ...s, chosen: true }));
    } else {
      chosen = statesFlat.map(s => ({ ...s, chosen: false }));

      console.log(
        'Starting whitelist with',
        numWinnersRemaining,
        'winners remaining',
      );
      for (let i = 0; i < chosen.length; i++) {
        if (
          chosen[i].chosen != true &&
          chosen[i].eligible &&
          chosen[i].whitelisted
        ) {
          chosen[i].chosen = true;
          numWinnersRemaining--;
        }
      }

      console.log('Doing lottery for', numWinnersRemaining);
      while (numWinnersRemaining > 0) {
        const rand = Math.floor(Math.random() * chosen.length);
        if (chosen[rand].chosen != true && chosen[rand].eligible) {
          chosen[rand].chosen = true;
          numWinnersRemaining--;
        }
      }
    }
    const sorted = chosen.sort((a, b) => a.seq - b.seq);
    console.log('Lottery results', sorted);

    await Promise.all(
      // each 8 entries is 1 byte, we want to send up 10 bytes at a time.
      // be specific here.
      chunks(Array.from(Array(sorted.length).keys()), 8 * 10).map(
        async allIndexesInSlice => {
          const bytes = [];
          const correspondingArrayOfBits = [];
          const startingOffset = Math.floor(allIndexesInSlice[0] / 8);
          let positionFromRight = 7;
          let currByte = 0;
          let currByteAsBits = [];
          for (let i = 0; i < allIndexesInSlice.length; i++) {
            if (chosen[allIndexesInSlice[i]].chosen) {
              const mask = Math.pow(2, positionFromRight);
              currByte = currByte | mask;
              currByteAsBits.push(1);
            } else {
              currByteAsBits.push(0);
            }
            positionFromRight--;
            if (positionFromRight < 0) {
              bytes.push(currByte);
              correspondingArrayOfBits.push(currByteAsBits);
              currByte = 0;
              currByteAsBits = [];
              positionFromRight = 7;
            }
          }

          if (positionFromRight != 7) {
            // grab the last one if the loop hasnt JUST ended exactly right before on an additional add.
            bytes.push(currByte);
            correspondingArrayOfBits.push(currByteAsBits);
          }

          console.log(
            'Setting bytes array for',
            startingOffset,
            'to',
            allIndexesInSlice[allIndexesInSlice.length - 1],
            'as (with split out by bits for ease of reading)',
            bytes.map((e, i) => [e, correspondingArrayOfBits[i]]),
          );

          await anchorProgram.rpc.updateFairLaunchLotteryBitmap(
            startingOffset,
            Buffer.from(bytes),
            {
              accounts: {
                fairLaunch,
                fairLaunchLotteryBitmap,
                authority: walletKeyPair.publicKey,
                clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
              },
            },
          );
        },
      ),
    );

    console.log('All done');
  });

program
  .command('create_missing_sequences')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch, rpcUrl } = cmd.opts();
    const fairLaunchTicketSeqStart = 8 + 32 + 32 + 8 + 1 + 1;
    const fairLaunchTicketState = 8 + 32 + 32 + 8;
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );
    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunch,
    );
    const tickets = await anchorProgram.provider.connection.getProgramAccounts(
      FAIR_LAUNCH_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset: 8,
              bytes: fairLaunch,
            },
          },
        ],
      },
    );

    await Promise.all(
      chunks(Array.from(Array(tickets.length).keys()), 500).map(
        async allIndexesInSlice => {
          for (let i = 0; i < allIndexesInSlice.length; i++) {
            const accountAndPubkey = tickets[allIndexesInSlice[i]];
            const { account, pubkey } = accountAndPubkey;
            const state = account.data[fairLaunchTicketState];
            if (state == 0) {
              console.log('Missing sequence for ticket', pubkey.toBase58());
              const [fairLaunchTicketSeqLookup, seqBump] =
                await getFairLaunchTicketSeqLookup(
                  //@ts-ignore
                  fairLaunchObj.tokenMint,
                  new anchor.BN(
                    account.data.slice(
                      fairLaunchTicketSeqStart,
                      fairLaunchTicketSeqStart + 8,
                    ),
                    undefined,
                    'le',
                  ),
                );
              try {
                await anchorProgram.rpc.createTicketSeq(seqBump, {
                  accounts: {
                    fairLaunchTicketSeqLookup,
                    fairLaunch,
                    fairLaunchTicket: pubkey,
                    payer: walletKeyPair.publicKey,
                    systemProgram: anchor.web3.SystemProgram.programId,
                    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
                  },
                  options: {
                    commitment: 'single',
                  },
                  signers: [],
                });
              } catch (e) {
                console.log('Skipping...');
                console.error(e);
              }
              console.log('Created...');
            }
          }
        },
      ),
    );
  });

program
  .command('show')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')

  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (options, cmd) => {
    const { env, fairLaunch, keypair, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );

    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunch,
    );

    let treasuryAmount = 0;
    // @ts-ignore
    if (fairLaunchObj.treasuryMint) {
      const token =
        await anchorProgram.provider.connection.getTokenAccountBalance(
          // @ts-ignore
          fairLaunchObj.treasury,
        );
      treasuryAmount = token.value.uiAmount;
    } else {
      treasuryAmount = await anchorProgram.provider.connection.getBalance(
        // @ts-ignore
        fairLaunchObj.treasury,
      );
    }

    //@ts-ignore
    console.log('UUID', fairLaunchObj.data.uuid);
    //@ts-ignore
    console.log('Token Mint', fairLaunchObj.tokenMint.toBase58());
    //@ts-ignore
    console.log('Treasury', fairLaunchObj.treasury.toBase58());
    //@ts-ignore
    console.log('Treasury Mint', fairLaunchObj.treasuryMint?.toBase58());
    //@ts-ignore
    console.log(
      'Participation Mint',
      //@ts-ignore
      fairLaunchObj.participationMint?.toBase58(),
    );
    //@ts-ignore
    console.log('Authority', fairLaunchObj.authority.toBase58());
    //@ts-ignore
    console.log('Bump', fairLaunchObj.bump);
    //@ts-ignore
    console.log('Treasury Bump', fairLaunchObj.treasuryBump);
    //@ts-ignore
    console.log('Token Mint Bump', fairLaunchObj.tokenMintBump);
    //@ts-ignore
    console.log('Participation Modulo', fairLaunchObj.participationModulo);
    //@ts-ignore
    if (fairLaunchObj.data.antiRugSetting) {
      console.log('Anti-Rug Settings:');
      //@ts-ignore
      console.log('Reserve bps', fairLaunchObj.data.antiRugSetting.reserveBp);
      //@ts-ignore
      console.log(
        'Number of tokens remaining in circulation below which you are allowed to retrieve treasury in full:',
        //@ts-ignore
        fairLaunchObj.data.antiRugSetting.tokenRequirement.toNumber(),
      );
      console.log(
        'Self destruct date - Date at which refunds are allowed (but not required):',
        //@ts-ignore
        new Date(fairLaunchObj.data.antiRugSetting.selfDestructDate * 1000),
      );
    } else {
      console.log('Anti-Rug Settings: None');
    }
    console.log(
      'Price Range Start        ',
      //@ts-ignore
      fairLaunchObj.data.priceRangeStart.toNumber(),
    );
    console.log(
      'Price Range End          ',
      //@ts-ignore
      fairLaunchObj.data.priceRangeEnd.toNumber(),
    );

    console.log(
      'Tick Size                ',
      //@ts-ignore
      fairLaunchObj.data.tickSize.toNumber(),
    );

    console.log(
      'Fees                     ',
      //@ts-ignore
      fairLaunchObj.data.fee.toNumber(),
    );

    console.log('Current Treasury Holdings', treasuryAmount);

    console.log(
      'Treasury Snapshot At Peak',
      //@ts-ignore
      fairLaunchObj.treasurySnapshot?.toNumber(),
    );

    console.log(
      'Phase One Start   ',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseOneStart.toNumber() * 1000),
    );
    console.log(
      'Phase One End     ',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseOneEnd.toNumber() * 1000),
    );
    console.log(
      'Phase Two End     ',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseTwoEnd.toNumber() * 1000),
    );

    console.log(
      'Lottery Period End',
      //@ts-ignore
      new Date(
        //@ts-ignore
        (fairLaunchObj.data.phaseTwoEnd.toNumber() +
          //@ts-ignore
          fairLaunchObj.data.lotteryDuration.toNumber()) *
          1000,
      ),
    );

    console.log(
      'Number of Tokens',
      //@ts-ignore
      fairLaunchObj.data.numberOfTokens.toNumber(),
    );

    console.log(
      'Number of Tickets Un-Sequenced     ',
      //@ts-ignore
      fairLaunchObj.numberTicketsUnSeqed.toNumber(),
    );

    console.log(
      'Number of Tickets Sold             ',
      //@ts-ignore
      fairLaunchObj.numberTicketsSold.toNumber(),
    );

    console.log(
      'Number of Tickets Dropped          ',
      //@ts-ignore
      fairLaunchObj.numberTicketsDropped.toNumber(),
    );

    console.log(
      'Number of Tickets Punched          ',
      //@ts-ignore
      fairLaunchObj.numberTicketsPunched.toNumber(),
    );

    console.log(
      'Number of Tickets Dropped + Punched',
      //@ts-ignore
      fairLaunchObj.numberTicketsDropped.toNumber() +
        //@ts-ignore
        fairLaunchObj.numberTicketsPunched.toNumber(),
    );

    console.log(
      'Number of Tokens Refunded          ',
      //@ts-ignore
      fairLaunchObj.numberTokensBurnedForRefunds.toNumber(),
    );

    console.log(
      'Number of Tokens Preminted         ',
      //@ts-ignore
      fairLaunchObj.numberTokensPreminted.toNumber(),
    );

    console.log(
      'Phase Three Started',
      //@ts-ignore
      fairLaunchObj.phaseThreeStarted,
    );

    console.log(
      'Current Eligible Holders',
      //@ts-ignore
      fairLaunchObj.currentEligibleHolders.toNumber(),
    );

    console.log(
      'Current Median',
      //@ts-ignore
      fairLaunchObj.currentMedian.toNumber(),
    );

    console.log('Counts at Each Tick');
    //@ts-ignore
    fairLaunchObj.countsAtEachTick.forEach((c, i) =>
      console.log(
        //@ts-ignore
        fairLaunchObj.data.priceRangeStart.toNumber() +
          //@ts-ignore
          i * fairLaunchObj.data.tickSize.toNumber(),
        ':',
        c.toNumber(),
      ),
    );
  });

program
  .command('show_ticket')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option('-b, --fair-launch-ticket-buyer <string>', 'fair launch ticket buyer')
  .action(async (options, cmd) => {
    const { env, fairLaunch, keypair, fairLaunchTicketBuyer } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunch,
    );

    const fairLaunchTicket = (
      await getFairLaunchTicket(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        fairLaunchTicketBuyer
          ? new anchor.web3.PublicKey(fairLaunchTicketBuyer)
          : walletKeyPair.publicKey,
      )
    )[0];

    const fairLaunchTicketObj =
      await anchorProgram.account.fairLaunchTicket.fetch(fairLaunchTicket);

    //@ts-ignore
    console.log('Buyer', fairLaunchTicketObj.buyer.toBase58());
    //@ts-ignore
    console.log('Fair Launch', fairLaunchTicketObj.fairLaunch.toBase58());
    //@ts-ignore
    console.log('Current Amount', fairLaunchTicketObj.amount.toNumber());
    //@ts-ignore
    console.log('State', fairLaunchTicketObj.state);
    //@ts-ignore
    console.log('Bump', fairLaunchTicketObj.bump);
    //@ts-ignore
    console.log('Sequence', fairLaunchTicketObj.seq.toNumber());
  });

program
  .command('show_lottery')
  .option(
    '-e, --env <string>',
    'Solana cluster env name',
    'devnet', //mainnet-beta, testnet, devnet
  )
  .option(
    '-k, --keypair <path>',
    `Solana wallet location`,
    '--keypair not provided',
  )
  .option('-f, --fair-launch <string>', 'fair launch id')
  .option(
    '-r, --rpc-url <string>',
    'custom rpc url since this is a heavy command',
  )
  .action(async (options, cmd) => {
    const { env, fairLaunch, keypair, rpcUrl } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(
      walletKeyPair,
      env,
      rpcUrl,
    );

    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunch,
    );

    const fairLaunchLottery = (
      await getFairLaunchLotteryBitmap(
        //@ts-ignore
        fairLaunchObj.tokenMint,
      )
    )[0];

    const fairLaunchLotteryBitmapObj =
      await anchorProgram.provider.connection.getAccountInfo(fairLaunchLottery);

    const fairLaunchLotteryBitmapAnchorObj =
      await anchorProgram.account.fairLaunchLotteryBitmap.fetch(
        fairLaunchLottery,
      );
    const seqKeys = [];
    //@ts-ignore
    for (let i = 0; i < fairLaunchObj.numberTicketsSold; i++) {
      seqKeys.push(
        (
          await getFairLaunchTicketSeqLookup(
            //@ts-ignore
            fairLaunchObj.tokenMint,
            new anchor.BN(i),
          )
        )[0],
      );
    }
    const buyers: { seq: anchor.BN; buyer: anchor.web3.PublicKey }[][] =
      await Promise.all(
        chunks(Array.from(Array(seqKeys.length).keys()), 1000).map(
          async allIndexesInSlice => {
            let ticketKeys = [];
            for (let i = 0; i < allIndexesInSlice.length; i += 100) {
              console.log(
                'Pulling ticket seqs for slice',
                allIndexesInSlice[i],
                allIndexesInSlice[i + 100],
              );
              const slice = allIndexesInSlice
                .slice(i, i + 100)
                .map(index => seqKeys[index]);
              const result = await getMultipleAccounts(
                anchorProgram.provider.connection,
                slice.map(s => s.toBase58()),
                'recent',
              );
              ticketKeys = ticketKeys.concat(
                result.array.map(a => ({
                  buyer: new anchor.web3.PublicKey(
                    new Uint8Array(a.data.slice(8 + 32, 8 + 32 + 32)),
                  ),
                  seq: new anchor.BN(
                    a.data.slice(8 + 32 + 32, 8 + 32 + 32 + 8),
                    undefined,
                    'le',
                  ),
                })),
              );

              return ticketKeys;
            }
          },
        ),
      );

    const buyersFlattened = buyers
      .flat()
      .sort((a, b) => a.seq.toNumber() - b.seq.toNumber());

    for (let i = 0; i < buyersFlattened.length; i++) {
      const buyer = buyersFlattened[i];

      const myByte =
        fairLaunchLotteryBitmapObj.data[
          FAIR_LAUNCH_LOTTERY_SIZE + Math.floor(buyer.seq.toNumber() / 8)
        ];

      const positionFromRight = 7 - (buyer.seq.toNumber() % 8);
      const mask = Math.pow(2, positionFromRight);
      const isWinner = myByte & mask;
      console.log(
        'Ticket',
        buyer.seq,
        buyer.buyer.toBase58(),
        isWinner > 0 ? 'won' : 'lost',
      );
    }

    console.log(
      'Bit Map ones',
      //@ts-ignore
      fairLaunchLotteryBitmapAnchorObj.bitmapOnes.toNumber(),
    );
  });
program.parse(process.argv);
