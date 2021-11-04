import { program } from 'commander';
import log from 'loglevel';
import {
  getAtaForMint,
  getMasterEdition,
  getMetadata,
  getTokenAmount,
  getTokenEntanglement,
  getTokenEntanglementEscrows,
  loadTokenEntanglementProgream,
  loadWalletKey,
} from './helpers/accounts';
import { BN, web3, Program } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from './helpers/constants';
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { getPriceWithMantissa } from './helpers/various';
import { sendTransactionWithRetryWithKeypair } from './helpers/transactions';
import { decodeMetadata, Metadata } from './helpers/schema';

program.version('0.0.1');
log.setLevel('info');

export const getEpKeyFromArgs = async (
  anchorProgram: Program,
  mintA: web3.PublicKey | null,
  mintB: web3.PublicKey | null,
  entangledPair: string | undefined,
): Promise<web3.PublicKey> => {
  let epKey;
  if (!entangledPair) {
    log.info('No entangled pair detected, generating from mint arguments.');
    epKey = (await getTokenEntanglement(mintA, mintB))[0];

    const obj = await anchorProgram.provider.connection.getAccountInfo(epKey);
    if (!obj) {
      epKey = (await getTokenEntanglement(mintB, mintA))[0];
    }
  } else {
    epKey = new web3.PublicKey(entangledPair);
  }

  return epKey;
};
programCommand('show')
  .option(
    '-ep, --entangled-pair <string>',
    'Optional. Overrides mint arguments.',
  )
  .option('-ma, --mint-a <string>', 'mint a')
  .option('-mb, --mint-b <string>', 'mint b')
  .action(async (directory, cmd) => {
    const { keypair, env, entangledPair, mintA, mintB } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);

    const anchorProgram = await loadTokenEntanglementProgream(
      walletKeyPair,
      env,
    );

    const epKey = await getEpKeyFromArgs(
      anchorProgram,
      mintA ? new web3.PublicKey(mintA) : null,
      mintB ? new web3.PublicKey(mintB) : null,
      entangledPair,
    );

    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);

    log.info('-----');
    log.info('Entangled Pair:', epKey.toBase58());
    //@ts-ignore
    log.info('Mint:', epObj.treasuryMint.toBase58());
    //@ts-ignore
    log.info('Authority:', epObj.authority.toBase58());
    //@ts-ignore
    log.info('Mint A:', epObj.mintA.toBase58());
    //@ts-ignore
    log.info('Mint B:', epObj.mintB.toBase58());
    //@ts-ignore
    log.info('Token A Escrow:', epObj.tokenAEscrow.toBase58());
    //@ts-ignore
    log.info('Token B Escrow:', epObj.tokenBEscrow.toBase58());
    //@ts-ignore
    log.info('Price:', epObj.price.toNumber());
    //@ts-ignore
    log.info('Paid At Least Once:', epObj.paid);
    //@ts-ignore
    log.info('Pays Every Time:', epObj.paysEveryTime);
    //@ts-ignore
    log.info('Bump:', epObj.bump);
  });

programCommand('create_entanglement')
  .option(
    '-tm, --treasury-mint <string>',
    'Mint address of treasury. If not used, default to SOL.',
  )
  .option('-a, --authority <string>', 'Authority, defaults to keypair')
  .option('-p, --price <string>', 'Price for a swap')
  .option(
    '-pet, --pays-every-time <string>',
    'If true, the user must pay the swapping fee each swap',
  )
  .option(
    '-ma, --mint-a <string>',
    'Mint a. You do not even need to own this token to create this entanglement.',
  )
  .option(
    '-mb, --mint-b <string>',
    'Mint b. This token will be removed from your token account right now.',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      price,
      paysEveryTime,
      mintA,
      mintB,
      treasuryMint,
      authority,
    } = cmd.opts();

    const priceNumber = parseFloat(price);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadTokenEntanglementProgream(
      walletKeyPair,
      env,
    );

    let authorityKey: web3.PublicKey, tMintKey: web3.PublicKey;
    if (!authority) {
      log.info('No authority detected, using keypair');
      authorityKey = walletKeyPair.publicKey;
    } else {
      authorityKey = new web3.PublicKey(authority);
    }

    const mintAKey = new web3.PublicKey(mintA);
    const mintBKey = new web3.PublicKey(mintB);

    if (!treasuryMint) {
      log.info('No treasury mint detected, using SOL.');
      tMintKey = WRAPPED_SOL_MINT;
    } else {
      tMintKey = new web3.PublicKey(treasuryMint);
    }

    const [entangledPair, bump] = await getTokenEntanglement(
      mintAKey,
      mintBKey,
    );

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
        walletKeyPair,
        anchorProgram,
      ),
    );
    const ata = (await getAtaForMint(mintBKey, walletKeyPair.publicKey))[0];
    const transferAuthority = web3.Keypair.generate();
    const signers = [transferAuthority];
    const instruction = await anchorProgram.instruction.createEntangledPair(
      bump,
      reverseBump,
      tokenABump,
      tokenBBump,
      priceAdjusted,
      paysEveryTime == 'true',
      {
        accounts: {
          treasuryMint: tMintKey,
          payer: walletKeyPair.publicKey,
          transferAuthority: transferAuthority.publicKey,
          authority: authorityKey,
          mintA: mintAKey,
          metadataA: await getMetadata(mintAKey),
          editionA: await getMasterEdition(mintAKey),
          mintB: mintBKey,
          metadataB: await getMetadata(mintBKey),
          editionB: await getMasterEdition(mintBKey),
          tokenB: ata,
          tokenAEscrow,
          tokenBEscrow,
          entangledPair,
          reverseEntangledPair,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
      },
    );

    const instructions = [
      Token.createApproveInstruction(
        TOKEN_PROGRAM_ID,
        ata,
        transferAuthority.publicKey,
        walletKeyPair.publicKey,
        [],
        1,
      ),
      instruction,
      Token.createRevokeInstruction(
        TOKEN_PROGRAM_ID,
        ata,
        walletKeyPair.publicKey,
        [],
      ),
    ];

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      signers,
      'max',
    );

    log.info('Created entanglement', entangledPair.toBase58());
  });

programCommand('swap')
  .option(
    '-ep, --entangled-pair <string>',
    'Optional. Overrides mint arguments.',
  )
  .option(
    '-ma, --mint-a <string>',
    'Mint a. You do not even need to own this token to create this entanglement.',
  )
  .option(
    '-mb, --mint-b <string>',
    'Mint b. This token will be removed from your token account right now.',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const { keypair, env, mintA, mintB, entangledPair } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadTokenEntanglementProgream(
      walletKeyPair,
      env,
    );

    const epKey = await getEpKeyFromArgs(
      anchorProgram,
      mintA ? new web3.PublicKey(mintA) : null,
      mintB ? new web3.PublicKey(mintB) : null,
      entangledPair,
    );

    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);

    //@ts-ignore
    const mintAKey = epObj.mintA;
    //@ts-ignore
    const mintBKey = epObj.mintB;
    const aAta = (await getAtaForMint(mintAKey, walletKeyPair.publicKey))[0];
    const bAta = (await getAtaForMint(mintBKey, walletKeyPair.publicKey))[0];
    const currABal = await getTokenAmount(anchorProgram, aAta, mintAKey);
    const token = currABal == 1 ? aAta : bAta,
      replacementToken = currABal == 1 ? bAta : aAta;
    const tokenMint = currABal == 1 ? mintAKey : mintBKey,
      replacementTokenMint = currABal == 1 ? mintBKey : mintAKey;
    const result = await getTokenEntanglementEscrows(mintAKey, mintBKey);

    const tokenAEscrow = result[0];
    const tokenBEscrow = result[2];
    const transferAuthority = web3.Keypair.generate();
    const paymentTransferAuthority = web3.Keypair.generate();
    const tokenMetadata = await getMetadata(tokenMint);
    const signers = [transferAuthority];

    //@ts-ignore
    const isNative = epObj.treasuryMint.equals(WRAPPED_SOL_MINT);

    //@ts-ignore
    const paymentAccount = isNative
      ? walletKeyPair.publicKey
      : (await getAtaForMint(epObj.treasuryMint, walletKeyPair.publicKey))[0];

    if (!isNative) signers.push(paymentTransferAuthority);

    const remainingAccounts = [];

    const metadataObj = await anchorProgram.provider.connection.getAccountInfo(
      tokenMetadata,
    );
    const metadataDecoded: Metadata = decodeMetadata(
      Buffer.from(metadataObj.data),
    );

    for (let i = 0; i < metadataDecoded.data.creators.length; i++) {
      remainingAccounts.push({
        pubkey: new web3.PublicKey(metadataDecoded.data.creators[i].address),
        isWritable: true,
        isSigner: false,
      });
      if (!isNative) {
        remainingAccounts.push({
          pubkey: (
            await getAtaForMint(
              //@ts-ignore
              epObj.treasuryMint,
              remainingAccounts[remainingAccounts.length - 1].pubkey,
            )
          )[0],
          isWritable: true,
          isSigner: false,
        });
      }
    }
    const instruction = await anchorProgram.instruction.swap({
      accounts: {
        //@ts-ignore
        treasuryMint: epObj.treasuryMint,
        payer: walletKeyPair.publicKey,
        paymentAccount,
        transferAuthority: transferAuthority.publicKey,
        paymentTransferAuthority: paymentTransferAuthority.publicKey,
        token,
        tokenMetadata,
        replacementToken,
        replacementTokenMint,
        tokenAEscrow,
        tokenBEscrow,
        entangledPair: epKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
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
        walletKeyPair.publicKey,
        [],
        1,
      ),
      ...(!isNative
        ? [
            Token.createApproveInstruction(
              TOKEN_PROGRAM_ID,
              paymentAccount,
              paymentTransferAuthority.publicKey,
              walletKeyPair.publicKey,
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
        walletKeyPair.publicKey,
        [],
      ),
      ...(!isNative
        ? [
            Token.createRevokeInstruction(
              TOKEN_PROGRAM_ID,
              paymentAccount,
              walletKeyPair.publicKey,
              [],
            ),
          ]
        : []),
    ];

    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      signers,
      'max',
    );

    log.info(
      'Swapped',
      tokenMint.toBase58(),
      'mint for',
      replacementTokenMint.toBase58(),
      ' with entangled pair ',
      epKey.toBase58(),
    );
  });

programCommand('update_entanglement')
  .option(
    '-ep, --entangled-pair <string>',
    'Optional. Overrides mint arguments.',
  )
  .option('-na, --new-authority <string>', 'Authority, defaults to keypair')
  .option('-p, --price <string>', 'Price for a swap')
  .option(
    '-pet, --pays-every-time <string>',
    'If true, the user must pay the swapping fee each swap',
  )
  .option(
    '-ma, --mint-a <string>',
    'Mint a. You do not even need to own this token to create this entanglement.',
  )
  .option(
    '-mb, --mint-b <string>',
    'Mint b. This token will be removed from your token account right now.',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      price,
      paysEveryTime,
      mintA,
      mintB,
      entangledPair,
      newAuthority,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadTokenEntanglementProgream(
      walletKeyPair,
      env,
    );

    const epKey = await getEpKeyFromArgs(
      anchorProgram,
      mintA ? new web3.PublicKey(mintA) : null,
      mintB ? new web3.PublicKey(mintB) : null,
      entangledPair,
    );

    const epObj = await anchorProgram.account.entangledPair.fetch(epKey);

    //@ts-ignore
    const authorityKey = new web3.PublicKey(
      newAuthority ? newAuthority : epObj.authority,
    );

    const priceAdjusted = price
      ? new BN(
          await getPriceWithMantissa(
            parseFloat(price),
            //@ts-ignore
            epObj.treasuryMint,
            walletKeyPair,
            anchorProgram,
          ),
        )
      : //@ts-ignore
        epObj.price;
    await anchorProgram.rpc.updateEntangledPair(
      priceAdjusted,
      paysEveryTime == 'true',
      {
        accounts: {
          newAuthority: authorityKey,
          //@ts-ignore
          authority: epObj.authority,
          entangledPair: epKey,
        },
      },
    );

    log.info('Updated entanglement', epKey.toBase58());
  });

function programCommand(name: string) {
  return program
    .command(name)
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
    .option('-l, --log-level <string>', 'log level', setLogLevel);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setLogLevel(value, prev) {
  if (value === undefined || value === null) {
    return;
  }
  log.info('setting the log value to: ' + value);
  log.setLevel(value);
}

program.parse(process.argv);
