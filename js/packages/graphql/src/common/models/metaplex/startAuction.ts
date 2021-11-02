import { SYSVAR_CLOCK_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { serialize } from "borsh";

import { SCHEMA } from "./schema";
import { StartAuctionArgs } from "./StartAuctionArgs";
import { getAuctionKeys } from "./getAuctionKeys";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";

export async function startAuction(
  vault: StringPublicKey,
  auctionManagerAuthority: StringPublicKey,
  instructions: TransactionInstruction[]
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error("Store not initialized");
  }

  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const value = new StartAuctionArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManagerKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(auctionManagerAuthority),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.auction),
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: SYSVAR_CLOCK_PUBKEY,
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
