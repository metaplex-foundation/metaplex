import { Keypair, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { TOKEN_METADATA_PROGRAM_ID } from '../helpers/constants';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import { loadCandyProgram, loadWalletKey } from '../helpers/accounts';
import { Program } from '@project-serum/anchor';

const METADATA_SIGNATURE = Buffer.from([7]); //now thats some voodoo magic. WTF metaplex? XD

export async function signMetadata(
  metadata: string,
  keypair: string,
  env: string,
  rpcUrl: string,
) {
  const creatorKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadCandyProgram(creatorKeyPair, env, rpcUrl);
  await signWithRetry(anchorProgram, creatorKeyPair, new PublicKey(metadata));
}

async function signWithRetry(
  anchorProgram: Program,
  creatorKeyPair: Keypair,
  metadataAddress: PublicKey,
) {
  await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    creatorKeyPair,
    [
      signMetadataInstruction(
        new PublicKey(metadataAddress),
        creatorKeyPair.publicKey,
      ),
    ],
    [],
    'single',
  );
}

export function signMetadataInstruction(
  metadata: PublicKey,
  creator: PublicKey,
): TransactionInstruction {
  const data = METADATA_SIGNATURE;

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
