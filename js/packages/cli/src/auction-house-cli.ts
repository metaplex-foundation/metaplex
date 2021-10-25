import { program } from 'commander';
import log from 'loglevel';
import {
  deserializeAccount,
  getAtaForMint,
  getAuctionHouse,
  getAuctionHouseFeeAcct,
  getAuctionHouseTreasuryAcct,
  loadAuctionHouseProgram,
  loadWalletKey,
} from './helpers/accounts';
import { web3 } from '@project-serum/anchor';
import { TOKEN_PROGRAM_ID, WRAPPED_SOL_MINT } from './helpers/constants';
import { ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

program.version('0.0.1');
log.setLevel('info');

export async function getAuctionHouseFromOpts(
  auctionHouse: any,
  walletKeyPair: any,
  tMintKey: any,
) {
  let auctionHouseKey;
  if (auctionHouse) {
    auctionHouseKey = new web3.PublicKey(auctionHouse);
  } else {
    log.info(
      'No auction house explicitly passed in, assuming you are creator on it and deriving key...',
    );
    auctionHouseKey = (
      await getAuctionHouse(walletKeyPair.publicKey, tMintKey)
    )[0];
  }
  return auctionHouseKey;
}

programCommand('show')
  .option(
    '-tm, --treasury-mint <string>',
    'Optional. Mint address of treasury. If not used, default to SOL. Ignored if providing -ah arg',
  )
  .option(
    '-ah, --auction-house <string>',
    'Specific auction house(if not provided, we assume you are asking for your own)',
  )
  .action(async (directory, cmd) => {
    const { keypair, env, auctionHouse, treasuryMint } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAuctionHouseProgram(walletKeyPair, env);
    let tMintKey;
    if (!treasuryMint) {
      log.info('No treasury mint detected, using SOL.');
      tMintKey = WRAPPED_SOL_MINT;
    } else {
      tMintKey = new web3.PublicKey(treasuryMint);
    }

    const auctionHouseKey = await getAuctionHouseFromOpts(
      auctionHouse,
      walletKeyPair,
      tMintKey,
    );

    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(
      auctionHouseKey,
    );

    let treasuryAmount = 0;
    if (!auctionHouseObj.treasuryMint.equals(WRAPPED_SOL_MINT)) {
      const token =
        await anchorProgram.provider.connection.getTokenAccountBalance(
          auctionHouseObj.auctionHouseTreasury,
        );
      treasuryAmount = token.value.uiAmount;
    } else {
      treasuryAmount = await anchorProgram.provider.connection.getBalance(
        auctionHouseObj.auctionHouseTreasury,
      );
    }

    const feeAmount = await anchorProgram.provider.connection.getBalance(
      auctionHouseObj.auctionHouseFeeAccount,
    );

    log.info('-----');
    log.info('Auction House:', auctionHouseKey.toBase58());
    log.info('Mint:', auctionHouseObj.treasuryMint.toBase58());
    log.info('Authority:', auctionHouseObj.authority.toBase58());
    log.info('Creator:', auctionHouseObj.creator.toBase58());
    log.info(
      'Fee Payer Acct:',
      auctionHouseObj.auctionHouseFeeAccount.toBase58(),
    );
    log.info('Treasury Acct:', auctionHouseObj.auctionHouseTreasury.toBase58());
    log.info(
      'Fee Payer Withdrawal Acct:',
      auctionHouseObj.feeWithdrawalDestination.toBase58(),
    );
    log.info(
      'Treasury Withdrawal Acct:',
      auctionHouseObj.treasuryWithdrawalDestination.toBase58(),
    );

    log.info('Fee Payer Bal:', feeAmount);
    log.info('Treasury Bal:', treasuryAmount);
    log.info('Seller Fee Basis Points:', auctionHouseObj.sellerFeeBasisPoints);
    log.info('Requires Sign Off:', auctionHouseObj.requiresSignOff);
    log.info('Can Change Sale Price:', auctionHouseObj.canChangeSalePrice);
    log.info('AH Bump:', auctionHouseObj.bump);
    log.info('AH Fee Bump:', auctionHouseObj.feePayerBump);
    log.info('AH Treasury Bump:', auctionHouseObj.treasuryBump);
  });

programCommand('create_auction_house')
  .option(
    '-tm, --treasury-mint <string>',
    'Mint address of treasury. If not used, default to SOL.',
  )
  .option(
    '-sfbp, --seller-fee-basis-points <string>',
    'Auction house cut of each txn, 10000 = 100%',
  )
  .option(
    '-ccsp, --can-change-sale-price <string>',
    'if true, and user initially places item for sale for 0, then AH can make new sell prices without consent(off chain price matching). Should only be used in concert with requires-sign-off, so AH is controlling every txn hitting the system.',
  )
  .option(
    '-rso, --requires-sign-off <string>',
    'if true, no txn can occur against this Auction House without AH authority as signer. Good if you are doing all txns through a pass-through GCP or something.',
  )
  .option(
    '-twd, --treasury-withdrawal-destination <string>',
    'if you wish to empty the treasury account, this is where it will land, default is your keypair. Pass in a wallet, not an ATA - ATA will be made for you if not present.',
  )
  .option(
    '-fwd, --fee-withdrawal-destination <string>',
    'if you wish to empty the fee paying account, this is where it will land, default is your keypair',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      sellerFeeBasisPoints,
      canChangeSalePrice,
      requiresSignOff,
      treasuryWithdrawalDestination,
      feeWithdrawalDestination,
      treasuryMint,
    } = cmd.opts();

    const sfbp = parseInt(sellerFeeBasisPoints);

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAuctionHouseProgram(walletKeyPair, env);

    let twdKey: web3.PublicKey,
      fwdKey: web3.PublicKey,
      tMintKey: web3.PublicKey;
    if (!treasuryWithdrawalDestination) {
      log.info('No treasury withdrawal dest detected, using keypair');
      twdKey = walletKeyPair.publicKey;
    } else {
      twdKey = new web3.PublicKey(treasuryWithdrawalDestination);
    }
    if (!feeWithdrawalDestination) {
      log.info('No fee withdrawal dest detected, using keypair');
      fwdKey = walletKeyPair.publicKey;
    } else {
      fwdKey = new web3.PublicKey(feeWithdrawalDestination);
    }
    if (!treasuryMint) {
      log.info('No treasury mint detected, using SOL.');
      tMintKey = WRAPPED_SOL_MINT;
    } else {
      tMintKey = new web3.PublicKey(treasuryMint);
    }
    const twdAta = tMintKey.equals(WRAPPED_SOL_MINT)
      ? twdKey
      : await getAtaForMint(tMintKey, twdKey)[0];

    const [auctionHouse, bump] = await getAuctionHouse(
      walletKeyPair.publicKey,
      tMintKey,
    );
    const [feeAccount, feeBump] = await getAuctionHouseFeeAcct(auctionHouse);
    const [treasuryAccount, treasuryBump] = await getAuctionHouseTreasuryAcct(
      auctionHouse,
    );

    await anchorProgram.rpc.createAuctionHouse(
      bump,
      feeBump,
      treasuryBump,
      sfbp,
      requiresSignOff == 'true',
      canChangeSalePrice == 'true',
      {
        accounts: {
          treasuryMint: tMintKey,
          payer: walletKeyPair.publicKey,
          authority: walletKeyPair.publicKey,
          feeWithdrawalDestination: fwdKey,
          treasuryWithdrawalDestination: twdAta,
          treasuryWithdrawalDestinationOwner: twdKey,
          auctionHouse,
          auctionHouseFeeAccount: feeAccount,
          auctionHouseTreasury: treasuryAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: web3.SYSVAR_RENT_PUBKEY,
        },
      },
    );
    log.info('Created auction house', auctionHouse.toBase58());
  });

programCommand('update_auction_house')
  .option(
    '-tm, --treasury-mint <string>',
    'Mint address of treasury used during creation. If not used, default to SOL. Ignored if providing -ah arg',
  )
  .option(
    '-ah, --auction-house <string>',
    'Specific auction house(if not provided, we assume you are asking for your own)',
  )
  .option(
    '-a, --new-authority <string>',
    'New authority of auction house - defaults to current authority',
  )
  .option('-f, --force', 'Cannot set authority without this flag being set.')
  .option(
    '-sfbp, --seller-fee-basis-points <string>',
    'Auction house cut of each txn, 10000 = 100%',
  )
  .option(
    '-ccsp, --can-change-sale-price <string>',
    'if true, and user initially places item for sale for 0, then AH can make new sell prices without consent(off chain price matching). Should only be used in concert with requires-sign-off, so AH is controlling every txn hitting the system.',
  )
  .option(
    '-rso, --requires-sign-off <string>',
    'if true, no txn can occur against this Auction House without AH authority as signer. Good if you are doing all txns through a pass-through GCP or something.',
  )
  .option(
    '-twd, --treasury-withdrawal-destination <string>',
    'if you wish to empty the treasury account, this is where it will land, default is your keypair. Pass in a wallet, not an ATA - ATA will be made for you if not present.',
  )
  .option(
    '-fwd, --fee-withdrawal-destination <string>',
    'if you wish to empty the fee paying account, this is where it will land, default is your keypair',
  )
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  .action(async (directory, cmd) => {
    const {
      keypair,
      env,
      sellerFeeBasisPoints,
      canChangeSalePrice,
      requiresSignOff,
      treasuryWithdrawalDestination,
      feeWithdrawalDestination,
      treasuryMint,
      auctionHouse,
      newAuthority,
      force,
    } = cmd.opts();

    const walletKeyPair = loadWalletKey(keypair);
    const anchorProgram = await loadAuctionHouseProgram(walletKeyPair, env);

    let tMintKey: web3.PublicKey;
    if (!treasuryMint) {
      log.info('No treasury mint detected, using SOL.');
      tMintKey = WRAPPED_SOL_MINT;
    } else {
      tMintKey = new web3.PublicKey(treasuryMint);
    }

    const auctionHouseKey = await getAuctionHouseFromOpts(
      auctionHouse,
      walletKeyPair,
      tMintKey,
    );
    const auctionHouseObj = await anchorProgram.account.auctionHouse.fetch(
      auctionHouseKey,
    );
    tMintKey = auctionHouseObj.treasuryMint;

    let twdKey: web3.PublicKey, fwdKey: web3.PublicKey;
    if (!treasuryWithdrawalDestination) {
      log.info('No treasury withdrawal dest detected, using original value');
      twdKey = tMintKey.equals(WRAPPED_SOL_MINT)
        ? auctionHouseObj.treasuryWithdrawalDestination
        : deserializeAccount(
            Buffer.from(
              (
                await anchorProgram.provider.connection.getAccountInfo(
                  auctionHouseObj.treasuryWithdrawalDestination,
                )
              ).data,
            ),
          ).owner;
    } else {
      twdKey = new web3.PublicKey(treasuryWithdrawalDestination);
    }
    if (!feeWithdrawalDestination) {
      log.info('No fee withdrawal dest detected, using original value');
      fwdKey = auctionHouseObj.feeWithdrawalDestination;
    } else {
      fwdKey = new web3.PublicKey(feeWithdrawalDestination);
    }
    const twdAta = tMintKey.equals(WRAPPED_SOL_MINT)
      ? twdKey
      : await getAtaForMint(tMintKey, twdKey)[0];

    let sfbp;
    if (sellerFeeBasisPoints != undefined && sellerFeeBasisPoints != null) {
      sfbp = parseInt(sellerFeeBasisPoints);
    } else {
      log.info('No sfbp passed in, using original value');
      sfbp = auctionHouseObj.sellerFeeBasisPoints;
    }

    let newAuth;
    if (newAuthority != undefined && newAuthority != null) {
      if (!force) {
        throw Error(
          'Cannot change authority without additional force flag. Are you sure you want to do this?',
        );
      }
      newAuth = newAuthority;
    } else {
      log.info('No authority passed in, using original value');
      newAuth = auctionHouseObj.authority;
    }

    let ccsp;
    if (canChangeSalePrice != undefined && canChangeSalePrice != null) {
      ccsp = canChangeSalePrice == 'true';
    } else {
      log.info('No can change sale price passed in, using original value');
      ccsp = auctionHouseObj.canChangeSalePrice;
    }

    let rso;
    if (requiresSignOff != undefined && requiresSignOff != null) {
      rso = requiresSignOff == 'true';
    } else {
      log.info('No requires sign off passed in, using original value');
      rso = auctionHouseObj.requiresSignOff;
    }
    await anchorProgram.rpc.updateAuctionHouse(sfbp, rso, ccsp, {
      accounts: {
        treasuryMint: tMintKey,
        payer: walletKeyPair.publicKey,
        authority: walletKeyPair.publicKey,
        // extra safety here even though newAuth should be right
        newAuthority: force ? newAuth : auctionHouseObj.authority,
        feeWithdrawalDestination: fwdKey,
        treasuryWithdrawalDestination: twdAta,
        treasuryWithdrawalDestinationOwner: twdKey,
        auctionHouse: auctionHouseKey,
        auctionHouseFeeAccount: auctionHouseObj.feePayer,
        auctionHouseTreasury: auctionHouseObj.treasury,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: web3.SystemProgram.programId,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: web3.SYSVAR_RENT_PUBKEY,
      },
    });
    log.info('Updated auction house', auctionHouseKey.toBase58());
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
