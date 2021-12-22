import * as anchor from '@project-serum/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  AccountLayout,
  MintInfo,
  MintLayout,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import BN from 'bn.js';

import log from 'loglevel';
import {
  CANDY_MACHINE_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_ENTANGLEMENT_PROGRAM_ID,
  WRAPPED_SOL_MINT,
} from './ids';

export const TOKEN_ENTANGLER = 'token_entangler';

export const getTokenEntanglement = async (
  mintA: anchor.web3.PublicKey,
  mintB: anchor.web3.PublicKey,
): Promise<[PublicKey, number]> => {
  return await anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(TOKEN_ENTANGLER), mintA.toBuffer(), mintB.toBuffer()],
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
  );
};

export const getEpKeyFromArgs = async (
  anchorProgram: anchor.Program,
  mintA: PublicKey | null,
  mintB: PublicKey | null,
  entangledPair: string | undefined,
): Promise<PublicKey> => {
  let epKey;
  if (!entangledPair) {
    log.info('No entangled pair detected, generating from mint arguments.');
    if (mintA && mintB) {
      epKey = (await getTokenEntanglement(mintA, mintB))[0];

      const obj = await anchorProgram.provider.connection.getAccountInfo(epKey);
      if (!obj) {
        epKey = (await getTokenEntanglement(mintB, mintA))[0];
      }
    }
  } else {
    epKey = new PublicKey(entangledPair);
  }

  return epKey;
};

export const getMintInfo = async (
  connection: Connection,
  mint: string,
): Promise<{ key: PublicKey; info: MintInfo }> => {
  let mintKey: PublicKey;
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
  walletKey: PublicKey,
  connection: Connection,
  mintKey: PublicKey,
  totalClaim: number,
) => {
  const [creatorTokenKey] = await PublicKey.findProgramAddress(
    [walletKey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintKey.toBuffer()],
    SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  );
  const creatorTokenAccount = await connection.getAccountInfo(creatorTokenKey);
  if (creatorTokenAccount === null) {
    throw new Error(`Could not fetch creator token account`);
  }
  if (creatorTokenAccount.data.length !== AccountLayout.span) {
    throw new Error(
      `Invalid token account size ${creatorTokenAccount.data.length}`,
    );
  }
  const creatorTokenInfo = AccountLayout.decode(
    Buffer.from(creatorTokenAccount.data),
  );
  if (new BN(creatorTokenInfo.amount, 8, 'le').toNumber() < totalClaim) {
    throw new Error(`Creator token account does not have enough tokens`);
  }
  return creatorTokenKey;
};

export const fetchCoder = async (
  address: anchor.Address,
  connection: Connection,
): Promise<anchor.Coder | null> => {
  //@ts-ignore
  return new anchor.Coder(
    //@ts-ignore
    await anchor.Program.fetchIdl(address, {
      connection: connection,
    } as anchor.Provider),
  );
};

export const getCandyConfig = async (
  connection: Connection,
  config: string,
): Promise<PublicKey> => {
  let configKey: PublicKey;
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
    [Buffer.from('candy_machine'), config.toBuffer(), Buffer.from(uuid)],
    CANDY_MACHINE_ID,
  );
};

export async function loadTokenEntanglementProgram(
  anchorWallet: anchor.Wallet,
  connection: Connection,
) {
  const provider = new anchor.Provider(connection, anchorWallet, {
    preflightCommitment: 'recent',
  });

  const idl = await anchor.Program.fetchIdl(
    TOKEN_ENTANGLEMENT_PROGRAM_ID,
    provider,
  );
  //@ts-ignore
  return new anchor.Program(idl, TOKEN_ENTANGLEMENT_PROGRAM_ID, provider);
}

export const getCandyMachine = async (
  connection: Connection,
  candyMachineKey: PublicKey,
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
    'CandyMachine',
    candyMachineAccount.data,
  );
};

export const getMetadata = async (mint: PublicKey): Promise<PublicKey> => {
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

export const getEdition = async (mint: PublicKey): Promise<PublicKey> => {
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
): Promise<PublicKey> => {
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
};

export async function getTokenAmount(
  anchorProgram: anchor.Program,
  account: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey,
): Promise<number> {
  let amount = 0;
  if (!mint.equals(WRAPPED_SOL_MINT)) {
    try {
      const token =
        await anchorProgram.provider.connection.getTokenAccountBalance(account);
      amount = token?.value?.uiAmount
        ? token.value.uiAmount * Math.pow(10, token.value.decimals)
        : 0;
    } catch (e) {
      log.error(e);
      log.info(
        'Account ',
        account.toBase58(),
        'didnt return value. Assuming 0 tokens.',
      );
    }
  } else {
    amount = await anchorProgram.provider.connection.getBalance(account);
  }
  return amount;
}
