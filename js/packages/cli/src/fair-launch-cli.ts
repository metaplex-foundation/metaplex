#!/usr/bin/env node
import * as fs from 'fs';
import { program } from 'commander';
import * as anchor from '@project-serum/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Token } from '@solana/spl-token';
import {
  CACHE_PATH,
  FAIR_LAUNCH_PROGRAM_ID,
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
} from './helpers/accounts';
import { sleep } from './helpers/various';
program.version('0.0.1');

if (!fs.existsSync(CACHE_PATH)) {
  fs.mkdirSync(CACHE_PATH);
}

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
  .option('-f, --fee <string>', 'price range end', '2')
  .option('-s, --price-range-start <string>', 'price range start', '1')
  .option('-e, --price-range-end <string>', 'price range end', '2')
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
    } = cmd.opts();
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

    if (!mint) {
      priceRangeStartNumber = Math.ceil(
        priceRangeStartNumber * LAMPORTS_PER_SOL,
      );
      priceRangeEndNumber = Math.ceil(priceRangeEndNumber * LAMPORTS_PER_SOL);
      tickSizeNumber = Math.ceil(tickSizeNumber * LAMPORTS_PER_SOL);
      feeNumber = Math.ceil(feeNumber * LAMPORTS_PER_SOL);
    }

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
    const [tokenMint, tokenBump] = await getTokenMint(
      walletKeyPair.publicKey,
      realUuid,
    );
    const [fairLaunch, fairLaunchBump] = await getFairLaunch(tokenMint);
    const [treasury, treasuryBump] = await getTreasury(tokenMint);
    console.log('Mint is', mint);
    const remainingAccounts = !mint
      ? []
      : [
          {
            pubkey: new anchor.web3.PublicKey(mint),
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
        tickSize: new anchor.BN(tickSizeNumber),
        numberOfTokens: new anchor.BN(parsedNumber),
        fee: new anchor.BN(feeNumber),
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
    if (!fairLaunchObj.treasuryMint) {
      amountNumber = Math.ceil(amountNumber * LAMPORTS_PER_SOL);
    } else {
      const transferAuthority = anchor.web3.Keypair.generate();
      signers.push(transferAuthority);

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          //@ts-ignore
          fairLaunchObj.treasuryMint,
          transferAuthority.publicKey,
          walletKeyPair.publicKey,
          [],
          //@ts-ignore
          amountNumber + fairLaunchObj.data.fees.toNumber(),
        ),
      );

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

    await anchorProgram.rpc.purchaseTicket(bump, new anchor.BN(amountNumber), {
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
      //__private: { logAccounts: true },
      remainingAccounts,
      signers,
      instructions: instructions.length > 0 ? instructions : undefined,
    });

    console.log(
      `create fair launch ticket Done: ${fairLaunchTicket.toBase58()}. Trying to create seq now...we may or may not get a validator with data on chain. Either way, your ticket is secure.`,
    );

    await sleep(5000);
    const fairLaunchTicketObj =
      await anchorProgram.account.fairLaunchTicket.fetch(fairLaunchTicket);

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
    let amountNumber = parseFloat(amount);

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

    const remainingAccounts = [];
    const instructions = [];
    const signers = [];

    //@ts-ignore
    if (!fairLaunchObj.treasuryMint) {
      amountNumber = Math.ceil(amountNumber * LAMPORTS_PER_SOL);
    } else {
      const transferAuthority = anchor.web3.Keypair.generate();
      signers.push(transferAuthority);

      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          //@ts-ignore
          fairLaunchObj.treasuryMint,
          transferAuthority.publicKey,
          walletKeyPair.publicKey,
          [],
          //@ts-ignore
          amountNumber + fairLaunchObj.data.fees.toNumber(),
        ),
      );

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

    await anchorProgram.rpc.adjustTicket(new anchor.BN(amountNumber), {
      accounts: {
        fairLaunchTicket,
        fairLaunch,
        fairLaunchLotteryBitmap,
        //@ts-ignore
        treasury: fairLaunchObj.treasury,
        buyer: walletKeyPair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      //__private: { logAccounts: true },
      remainingAccounts,
      signers,
      instructions: instructions.length > 0 ? instructions : undefined,
    });

    console.log(
      `update fair launch ticket Done: ${fairLaunchTicket.toBase58()}.`,
    );
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
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

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
  .action(async (_, cmd) => {
    const { env, keypair, fairLaunch } = cmd.opts();
    const fairLaunchTicketSeqStart = 8 + 32 + 32 + 8 + 1 + 1;
    const fairLaunchTicketState = 8 + 32 + 32 + 8;
    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);
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

    for (let i = 0; i < tickets.length; i++) {
      const accountAndPubkey = tickets[i];
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

        await anchorProgram.rpc.createTicketSeq(seqBump, {
          accounts: {
            fairLaunchTicketSeqLookup,
            fairLaunch,
            fairLaunchTicket: pubkey,
            payer: walletKeyPair.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          },
          signers: [],
        });
        console.log('Created...');
      }
    }
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
  .action(async (options, cmd) => {
    const { env, fairLaunch, keypair } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

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
    console.log('Token Mint', fairLaunchObj.tokenMint.toBase58());
    //@ts-ignore
    console.log('Treasury', fairLaunchObj.treasury.toBase58());
    //@ts-ignore
    console.log('Treasury Mint', fairLaunchObj.treasuryMint?.toBase58());
    //@ts-ignore
    console.log('Authority', fairLaunchObj.authority.toBase58());
    //@ts-ignore
    console.log('Bump', fairLaunchObj.bump);
    //@ts-ignore
    console.log('Treasury Bump', fairLaunchObj.treasuryBump);
    //@ts-ignore
    console.log('Token Mint Bump', fairLaunchObj.tokenMintBump);
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
      'Phase One Start',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseOneStart.toNumber() * 1000),
    );
    console.log(
      'Phase One End  ',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseOneEnd.toNumber() * 1000),
    );
    console.log(
      'Phase Two End  ',
      //@ts-ignore
      new Date(fairLaunchObj.data.phaseTwoEnd.toNumber() * 1000),
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
      'Phase Three Started',
      //@ts-ignore
      fairLaunchObj.phaseThreeStarted,
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
  .action(async (options, cmd) => {
    const { env, fairLaunch, keypair } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadFairLaunchProgram(walletKeyPair, env);

    const fairLaunchObj = await anchorProgram.account.fairLaunch.fetch(
      fairLaunch,
    );

    const fairLaunchTicket = (
      await getFairLaunchTicket(
        //@ts-ignore
        fairLaunchObj.tokenMint,
        walletKeyPair.publicKey,
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
program.parse(process.argv);
