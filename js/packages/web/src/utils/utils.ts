import { Connection, Keypair, TransactionInstruction } from "@solana/web3.js";
import { WalletSigner } from "@oyster/common/dist/lib/contexts/wallet";
import {
  createAssociatedTokenAccountInstruction,
  findProgramAddress,
  programIds, sendTransactionWithRetry,
  StringPublicKey,
  toPublicKey
} from "@oyster/common";
import { Token } from "@solana/spl-token";

export const cleanName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.replace(/\s+/g, '-');
};

export const sendNFTtoAddress = async (
  connection: Connection,
  wallet: WalletSigner | undefined,
  mintKey: StringPublicKey,
  addressKey: StringPublicKey,
): Promise<boolean> => {
  if (!wallet?.publicKey) return false;

  const pushInstructions: TransactionInstruction[] = [];
  const pushSigners: Keypair[] = [];

  const TOKEN_PROGRAM_ID = programIds().token;

  const payerPublicKey = wallet.publicKey.toBase58();
  const instructions: TransactionInstruction[] = [...pushInstructions];
  const signers: Keypair[] = [...pushSigners];

  const transferPublicKey = toPublicKey(addressKey);

  const recipientKey = (
    await findProgramAddress(
      [
        transferPublicKey.toBuffer(),
        programIds().token.toBuffer(),
        toPublicKey(mintKey).toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  console.log(recipientKey);

  createAssociatedTokenAccountInstruction(
    instructions,
    toPublicKey(recipientKey),
    wallet.publicKey,
    transferPublicKey,
    toPublicKey(mintKey),
  );

  instructions.push(
    Token.createMintToInstruction(
      TOKEN_PROGRAM_ID,
      toPublicKey(mintKey),
      toPublicKey(recipientKey),
      toPublicKey(payerPublicKey),
      [],
      1,
    ),
  );

  const { txid } = await sendTransactionWithRetry(
    connection,
    wallet,
    instructions,
    signers,
  );

  try {
    await connection.confirmTransaction(txid, 'max');
  } catch {
    // ignore
  }

  // Force wait for max confirmations
  // await connection.confirmTransaction(txid, 'max');
  await connection.getParsedConfirmedTransaction(txid, 'confirmed');

  return true;
};

export const getLast = <T>(arr: T[]) => {
  if (arr.length <= 0) {
    return undefined;
  }

  return arr[arr.length - 1];
};
