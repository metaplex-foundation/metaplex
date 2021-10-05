import {
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { serialize } from "borsh";

import { SCHEMA } from "./schema";
import { getAuctionKeys } from "./getAuctionKeys";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";
import { DeprecatedInitAuctionManagerV1Args } from "./DeprecatedInitAuctionManagerV1Args";
import { AuctionManagerSettingsV1 } from "./entities/AuctionManagerSettingsV1";

export async function deprecatedInitAuctionManagerV1(
  vault: StringPublicKey,
  auctionManagerAuthority: StringPublicKey,
  payer: StringPublicKey,
  acceptPaymentAccount: StringPublicKey,
  store: StringPublicKey,
  settings: AuctionManagerSettingsV1,
  instructions: TransactionInstruction[]
) {
  const PROGRAM_IDS = programIds();
  const { auctionKey, auctionManagerKey } = await getAuctionKeys(vault);

  const value = new DeprecatedInitAuctionManagerV1Args({
    settings,
  });

  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(auctionManagerKey),
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
