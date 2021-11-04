import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { serialize } from "borsh";

import { getWhitelistedCreator } from "./getWhitelistedCreator";
import { SCHEMA } from "./schema";
import { SetWhitelistedCreatorArgs } from "./SetWhitelistedCreatorArgs";
import { programIds, StringPublicKey, toPublicKey } from "../../utils";

export async function setWhitelistedCreator(
  creator: StringPublicKey,
  activated: boolean,
  admin: StringPublicKey,
  payer: StringPublicKey,
  instructions: TransactionInstruction[]
) {
  const { store, system, metaplex } = programIds();

  if (!store) {
    throw new Error("Store not initialized");
  }

  const whitelistedCreatorPDAKey = await getWhitelistedCreator(creator);

  const value = new SetWhitelistedCreatorArgs({ activated });
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(whitelistedCreatorPDAKey),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(admin),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(creator),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: system,
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
      programId: toPublicKey(metaplex),
      data,
    })
  );
}
