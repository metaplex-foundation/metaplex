import { TransactionInstruction } from "@solana/web3.js";
import { programIds } from "../utils/programIds";
import { serialize } from "borsh";
import { StringPublicKey, toPublicKey } from "../utils";
import { ExternalPriceAccount } from "./ExternalPriceAccount";
import { UpdateExternalPriceAccountArgs } from "./UpdateExternalPriceAccountArgs";
import { VAULT_SCHEMA } from "./schemas";

export async function updateExternalPriceAccount(
  externalPriceAccountKey: StringPublicKey,
  externalPriceAccount: ExternalPriceAccount,
  instructions: TransactionInstruction[]
) {
  const vaultProgramId = programIds().vault;

  const value = new UpdateExternalPriceAccountArgs({ externalPriceAccount });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(externalPriceAccountKey),
      isSigner: false,
      isWritable: true,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(vaultProgramId),
      data,
    })
  );
}
