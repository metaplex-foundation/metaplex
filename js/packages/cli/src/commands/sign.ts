import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_METADATA_PROGRAM_ID } from "../helpers/constants";
import { sendTransactionWithRetryWithKeypair } from "../helpers/transactions";
import { loadAnchorProgram, loadWalletKey } from "../helpers/accounts";
import { Program } from "@project-serum/anchor";


export async function signMetadata(
  metadata: string,
  keypair: string,
  env: string
) {
  const creatorKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadAnchorProgram(creatorKeyPair, env);
  await signWithRetry(anchorProgram, creatorKeyPair, metadata);
}

export async function signAllUnapprovedMetadata(
  keypair: string,
  env: string
) {
  const creatorKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadAnchorProgram(creatorKeyPair, env);
  const metadataIds = await findAllUnapprovedMetadataIds(anchorProgram, creatorKeyPair);

  for(const id in metadataIds) {
    await signWithRetry(anchorProgram, creatorKeyPair, id);
  }
}


// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function findAllUnapprovedMetadataIds(anchorProgram: Program, creatorKeyPair: Keypair): Promise<string[]> {
  //TODO well I need some help with that... so... help? :D
  throw new Error("Unsupported yet")
}

async function signWithRetry(anchorProgram: Program, creatorKeyPair: Keypair, metadataAddress: string) {
  await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    creatorKeyPair,
    [signMetadataInstruction(new PublicKey(metadataAddress), creatorKeyPair.publicKey)],
    [],
    'single',
  );
}

export function signMetadataInstruction(
  metadata: PublicKey,
  creator: PublicKey,
): TransactionInstruction {
  const data = Buffer.from([7]); //now thats bloody magic. WTF metaplex? XD

  const keys = [
    {
      pubkey: metadata,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: creator,
      isSigner: true,
      isWritable: false,
    },
  ];
  return new TransactionInstruction({
    keys,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data,
  });
}
