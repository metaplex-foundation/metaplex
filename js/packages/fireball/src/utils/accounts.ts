import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  MintInfo,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from 'bn.js';

import {
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
} from "./ids";

export const getMintInfo = async (
  connection : Connection,
  mint : string
) : Promise<{ key: PublicKey, info: MintInfo }> => {
  let mintKey : PublicKey;
  try {
    mintKey = new PublicKey(mint);
  } catch (err) {
    throw new Error(`Invalid mint key ${err}`);
  }
  const mintAccount = await connection.getAccountInfo(mintKey);
  if (mintAccount === null) {
    throw new Error(`Could not fetch mint`);
  }
  if (!mintAccount.owner.equals(TOKEN_PROGRAM_ID)) {
    const mintOwner = mintAccount.owner.toBase58();
    throw new Error(`Invalid mint owner ${mintOwner}`);
  }
  if (mintAccount.data.length !== MintLayout.span) {
    throw new Error(`Invalid mint size ${mintAccount.data.length}`);
  }
  const mintInfo = MintLayout.decode(Buffer.from(mintAccount.data));
  return {
    key: mintKey,
    info: mintInfo,
  };
};

export const getAssociatedTokenAccount = async (
  walletKey : PublicKey,
  mintKey : PublicKey,
) => {
  const [ataKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintKey.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
  return ataKey;
};

export const fetchCoder = async (
  address : anchor.Address,
  connection : Connection,
) : Promise<anchor.Coder | null> => {
  return new anchor.Coder(await anchor.Program.fetchIdl(
      address, { connection: connection } as anchor.Provider));
}

export const getMetadata = async (
  mint: PublicKey,
): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getEdition = async (
  mint: PublicKey,
): Promise<PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const getEditionMarkerPda = async (
  mint: PublicKey,
  edition: BN,
) : Promise<PublicKey> => {
  // editions are divided into pages of 31-bytes (248-bits) for more efficient
  // packing to check if an edition is occupied. The offset is determined from
  // the edition passed in through data
  const editionPageNumber = edition.div(new BN(248)).toNumber();

  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
        Buffer.from(String(editionPageNumber)),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
}
