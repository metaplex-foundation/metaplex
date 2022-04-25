import { config, Program } from '@metaplex-foundation/mpl-core';
import { PublicKey } from '@solana/web3.js';
import * as errors from './generated/errors';
import * as instructions from './generated/instructions';
import * as accounts from './generated/accounts';
import BN from 'bn.js';

export class AuctionHouseProgram extends Program {
  static readonly PREFIX = 'auction_house';
  static readonly FEE_PAYER = 'fee_payer';
  static readonly TREASURY = 'treasury';
  static readonly SIGNER = 'signer';
  static readonly LISTINE_RECEIPT = 'listing_receipt';
  static readonly BID_RECEIPT = 'bid_receipt';
  static readonly PURCHASE_RECEIPT = 'purchase_receipt';

  static readonly PUBKEY = new PublicKey(config.programs.auctionHouse);
  static readonly instructions = instructions;
  static readonly errors = errors;
  static readonly accounts = accounts;

  static readonly TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
  static readonly SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  );

  static async findAssociatedTokenAccountAddress(
    mint: PublicKey,
    wallet: PublicKey,
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [wallet.toBuffer(), AuctionHouseProgram.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      AuctionHouseProgram.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    );
  }

  static async findAuctionHouseAddress(
    creator: PublicKey,
    treasuryMint: PublicKey,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        creator.toBuffer(),
        treasuryMint.toBuffer(),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findAuctionHouseProgramAsSignerAddress(): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        Buffer.from(AuctionHouseProgram.SIGNER, 'utf8'),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findAuctionHouseTreasuryAddress(
    auctionHouse: PublicKey,
  ): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        auctionHouse.toBuffer(),
        Buffer.from(AuctionHouseProgram.TREASURY, 'utf8'),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findEscrowPaymentAccountAddress(
    auctionHouse: PublicKey,
    wallet: PublicKey,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'), auctionHouse.toBuffer(), wallet.toBuffer()],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findTradeStateAddress(
    wallet: PublicKey,
    auctionHouse: PublicKey,
    tokenAccount: PublicKey,
    treasuryMint: PublicKey,
    tokenMint: PublicKey,
    price: number,
    tokenSize: number,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        wallet.toBuffer(),
        auctionHouse.toBuffer(),
        tokenAccount.toBuffer(),
        treasuryMint.toBuffer(),
        tokenMint.toBuffer(),
        new BN(price).toArrayLike(Buffer, 'le', 8),
        new BN(tokenSize).toArrayLike(Buffer, 'le', 8),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findPublicBidTradeStateAddress(
    wallet: PublicKey,
    auctionHouse: PublicKey,
    treasuryMint: PublicKey,
    tokenMint: PublicKey,
    price: number,
    tokenSize: number,
  ): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        wallet.toBuffer(),
        auctionHouse.toBuffer(),
        treasuryMint.toBuffer(),
        tokenMint.toBuffer(),
        new BN(price).toArrayLike(Buffer, 'le', 8),
        new BN(tokenSize).toArrayLike(Buffer, 'le', 8),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findAuctionHouseFeeAddress(auctionHouse: PublicKey) {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PREFIX, 'utf8'),
        auctionHouse.toBuffer(),
        Buffer.from(AuctionHouseProgram.FEE_PAYER, 'utf8'),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findListingReceiptAddress(sellerTradeState: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from(AuctionHouseProgram.LISTINE_RECEIPT, 'utf8'), sellerTradeState.toBuffer()],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findBidReceiptAddress(buyerTradeState: PublicKey) {
    return PublicKey.findProgramAddress(
      [Buffer.from(AuctionHouseProgram.BID_RECEIPT, 'utf8'), buyerTradeState.toBuffer()],
      AuctionHouseProgram.PUBKEY,
    );
  }

  static async findPurchaseReceiptAddress(sellerTradeState: PublicKey, buyerTradeState: PublicKey) {
    return PublicKey.findProgramAddress(
      [
        Buffer.from(AuctionHouseProgram.PURCHASE_RECEIPT, 'utf8'),
        sellerTradeState.toBuffer(),
        buyerTradeState.toBuffer(),
      ],
      AuctionHouseProgram.PUBKEY,
    );
  }
}
