import { AccountInfo } from "@solana/web3.js";
import BN from "bn.js";
import { deserializeUnchecked } from "borsh";
import bs58 from "bs58";
import { StringPublicKey } from "../ids";
import { bnConverter } from "../serialization/converters/bnConverter";
import { ConverterSet } from "../serialization/converterSet";
import { accountConverterSet, AccountDocument, StoreAccountDocument } from "./account";
import { MetaplexKey } from "./types";

export interface BidRedemptionTicket {
  key: MetaplexKey;

  getBidRedeemed(order: number): boolean;
}

export class BidRedemptionTicketV1 implements BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV1;
  participationRedeemed: boolean = false;
  itemsRedeemed: number = 0;

  constructor(args?: BidRedemptionTicketV1) {
    Object.assign(this, args);
  }

  getBidRedeemed(): boolean {
    return this.participationRedeemed;
  }
}

export class BidRedemptionTicketV2 implements BidRedemptionTicket {
  key: MetaplexKey = MetaplexKey.BidRedemptionTicketV2;
  winnerIndex: BN | null;
  auctionManager: StringPublicKey;
  data: number[] = [];

  constructor(args: { key: MetaplexKey; data: number[] }) {
    Object.assign(this, args);
    let offset = 2;
    if (this.data[1] == 0) {
      this.winnerIndex = null;
    } else {
      this.winnerIndex = new BN(this.data.slice(2, 8), "le");
      offset += 8;
    }

    this.auctionManager = bs58.encode(this.data.slice(offset, offset + 32));
  }

  getBidRedeemed(order: number): boolean {
    let offset = 42;
    if (this.data[1] == 0) {
      offset -= 8;
    }
    const index = Math.floor(order / 8) + offset;
    const positionFromRight = 7 - (order % 8);
    const mask = Math.pow(2, positionFromRight);

    const appliedMask = this.data[index] & mask;

    return appliedMask != 0;
  }
}

const BID_REDEMPTION_TICKET_V1_SCHEMA = new Map<any, any>([
  [
    BidRedemptionTicketV1,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["participationRedeemed", "u8"], // bool
        ["itemsRedeemed", "u8"], // bool
      ],
    },
  ],
]);

export const decodeBidRedemptionTicket = (buffer: Buffer) => {
  return (
    buffer[0] == MetaplexKey.BidRedemptionTicketV1
      ? deserializeUnchecked(
          BID_REDEMPTION_TICKET_V1_SCHEMA,
          BidRedemptionTicketV1,
          buffer
        )
      : new BidRedemptionTicketV2({
          key: MetaplexKey.BidRedemptionTicketV2,
          data: buffer.toJSON().data,
        })
  ) as BidRedemptionTicketV1 | BidRedemptionTicketV2;
};

export class BidRedemptionTicketV2AccountDocument extends AccountDocument {
  auctionManager: string;
  winnerIndex: BN | null;

  constructor(
    pubkey: string,
    account: AccountInfo<Buffer>,
    auctionManager: string,
    winnerIndex: BN | null
  ) {
    super(pubkey, account);
    this.auctionManager = auctionManager;
    this.winnerIndex = winnerIndex;
  }
}

export const bidRedemptionV2Converters = (() => {
  const entries = Array.from(accountConverterSet.entries());
  entries.push(["winnerIndex", bnConverter]);
  const converters = new ConverterSet(entries);
  return converters;
})();
