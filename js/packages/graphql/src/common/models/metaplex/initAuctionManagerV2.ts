import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import BN from "bn.js";
import { serialize } from "borsh";

import { InitAuctionManagerV2Args } from "./InitAuctionManagerV2Args";
import { getAuctionWinnerTokenTypeTracker } from "./getAuctionWinnerTokenTypeTracker";
import { getAuctionKeys } from "./getAuctionKeys";
import { TupleNumericType } from "./TupleNumericType";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";
import { SCHEMA } from "./schema";

export async function initAuctionManagerV2(
  vault: StringPublicKey,
  auctionManagerAuthority: StringPublicKey,
  payer: StringPublicKey,
  acceptPaymentAccount: StringPublicKey,
  store: StringPublicKey,
  amountType: TupleNumericType,
  lengthType: TupleNumericType,
  maxRanges: BN,
  instructions: TransactionInstruction[]
) {
  const PROGRAM_IDS = programIds();
  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const value = new InitAuctionManagerV2Args({
    amountType,
    lengthType,
    maxRanges,
  });

  const tokenTracker = await getAuctionWinnerTokenTypeTracker(
    auctionManagerKey
  );

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(tokenTracker),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auctionManagerAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(acceptPaymentAccount),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(store),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    })
  );
}
