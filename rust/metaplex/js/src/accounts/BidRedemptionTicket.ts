import { AccountInfo } from '@solana/web3.js';
import { strict as assert } from 'assert';
import BN from 'bn.js';
import bs58 from 'bs58';
import { MetaplexKey, MetaplexProgram } from '../MetaplexProgram';
import {
  AnyPublicKey,
  StringPublicKey,
  Account,
  ERROR_DEPRECATED_ACCOUNT_DATA,
  ERROR_INVALID_ACCOUNT_DATA,
  ERROR_INVALID_OWNER,
} from '@metaplex-foundation/mpl-core';
import { Buffer } from 'buffer';

export interface BidRedemptionTicketV2Data {
  key: MetaplexKey;
  winnerIndex?: BN;
  auctionManager: StringPublicKey;
  data: number[];
}

export const WINNER_INDEX_OFFSETS = [2, 10];

export class BidRedemptionTicket extends Account<BidRedemptionTicketV2Data> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);

    if (!this.assertOwner(MetaplexProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }

    assert(this.info != null, 'account info needs to be defined');
    if (BidRedemptionTicket.isBidRedemptionTicketV1(this.info.data)) {
      throw ERROR_DEPRECATED_ACCOUNT_DATA();
    } else if (BidRedemptionTicket.isBidRedemptionTicketV2(this.info.data)) {
      const data = this.info.data.toJSON().data;

      const winnerIndex = data[1] !== 0 ? new BN(data.slice(1, 9), 'le') : undefined;
      const offset = WINNER_INDEX_OFFSETS[+!!winnerIndex];

      this.data = {
        key: MetaplexKey.BidRedemptionTicketV2,
        winnerIndex,
        data,
        auctionManager: bs58.encode(data.slice(offset, offset + 32)),
      };
    } else {
      throw ERROR_INVALID_ACCOUNT_DATA();
    }
  }

  static isCompatible(data: Buffer) {
    return (
      BidRedemptionTicket.isBidRedemptionTicketV1(data) ||
      BidRedemptionTicket.isBidRedemptionTicketV2(data)
    );
  }

  static isBidRedemptionTicketV1(data: Buffer) {
    return data[0] === MetaplexKey.BidRedemptionTicketV1;
  }

  static isBidRedemptionTicketV2(data: Buffer) {
    return data[0] === MetaplexKey.BidRedemptionTicketV2;
  }
}
