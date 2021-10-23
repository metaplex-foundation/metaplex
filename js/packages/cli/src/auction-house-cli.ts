import { program } from 'commander';
import log from 'loglevel';
import {
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
    '-ccsp, --can-change-sale-price',
    'if present, and user initially places item for sale for 0, then AH can make new sell prices without consent(off chain price matching). Should only be used in concert with requires-sign-off, so AH is controlling every txn hitting the system.',
  )
  .option(
    '-rso, --requires-sign-off',
    'if present, no txn can occur against this Auction House without AH authority as signer. Good if you are doing all txns through a pass-through GCP or something.',
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
    const twdAta =
      tMintKey == WRAPPED_SOL_MINT
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
      requiresSignOff,
      canChangeSalePrice,
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
        __private: { logAccounts: true },
      },
    );
    log.info('Created auction house', auctionHouse.toBase58());
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
