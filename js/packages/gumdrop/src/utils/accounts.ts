import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  AccountLayout,
  MintInfo,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import BN from 'bn.js';

import {
  CANDY_MACHINE_ID,
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

export const getCreatorTokenAccount = async (
  walletKey : PublicKey,
  connection : Connection,
  mintKey : PublicKey,
  totalClaim : number,
) => {
  const [creatorTokenKey, ] = await PublicKey.findProgramAddress(
    [
      walletKey.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mintKey.toBuffer(),
    ],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
  );
  const creatorTokenAccount = await connection.getAccountInfo(creatorTokenKey);
  if (creatorTokenAccount === null) {
    throw new Error(`Could not fetch creator token account`);
  }
  if (creatorTokenAccount.data.length !== AccountLayout.span) {
    throw new Error(`Invalid token account size ${creatorTokenAccount.data.length}`);
  }
  const creatorTokenInfo = AccountLayout.decode(Buffer.from(creatorTokenAccount.data));
  if (new BN(creatorTokenInfo.amount, 8, "le").toNumber() < totalClaim) {
    throw new Error(`Creator token account does not have enough tokens`);
  }
  return creatorTokenKey;
};

export const fetchCoder = async (
  address : anchor.Address,
  connection : Connection,
) : Promise<anchor.Coder | null> => {
  return new anchor.Coder(await anchor.Program.fetchIdl(
      address, { connection: connection } as anchor.Provider));
}

export const getCandyConfig = async (
  connection : Connection,
  config : string
) : Promise<PublicKey> => {
  let configKey : PublicKey;
  try {
    configKey = new PublicKey(config);
  } catch (err) {
    throw new Error(`Invalid config key ${err}`);
  }
  const configAccount = await connection.getAccountInfo(configKey);
  if (configAccount === null) {
    throw new Error(`Could not fetch config`);
  }
  if (!configAccount.owner.equals(CANDY_MACHINE_ID)) {
    throw new Error(`Invalid config owner ${configAccount.owner.toBase58()}`);
  }
  return configKey;
};

export const getCandyMachineAddress = async (
  config: PublicKey,
  uuid: string,
) => {
  return await PublicKey.findProgramAddress(
    [Buffer.from("candy_machine"), config.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_ID,
  );
};

export const getCandyMachine = async (
  connection : Connection,
  candyMachineKey : PublicKey,
) => {
  const candyMachineCoder = await fetchCoder(CANDY_MACHINE_ID, connection);
  if (candyMachineCoder === null) {
    throw new Error(`Could not fetch candy machine IDL`);
  }
  const candyMachineAccount = await connection.getAccountInfo(candyMachineKey);
  if (candyMachineAccount === null) {
    throw new Error(`Could not fetch candy machine`);
  }
  return candyMachineCoder.accounts.decode(
      "CandyMachine", candyMachineAccount.data);
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
