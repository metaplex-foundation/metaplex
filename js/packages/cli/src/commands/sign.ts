import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_METADATA_PROGRAM_ID } from "../helpers/constants";
import { sendTransactionWithRetryWithKeypair } from "../helpers/transactions";
import { getCandyMachineAddress, getMetadata, loadAnchorProgram, loadWalletKey } from "../helpers/accounts";
import { Program } from "@project-serum/anchor";
import { Config } from "../types";
import { sleep } from "../helpers/various";
import { loadCache, saveCache } from "../helpers/cache";

const METADATA_SIGNATURE = Buffer.from([7]);//now thats some voodoo magic. WTF metaplex? XD
const SLEEP_AT_THE_END_OF_CHAIN = 200; // amount of time [ms] to wait between requests

export async function signMetadata(
  metadata: string,
  keypair: string,
  env: string
) {
  const creatorKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadAnchorProgram(creatorKeyPair, env);
  await signWithRetry(anchorProgram, creatorKeyPair, new PublicKey(metadata));
}

export async function signAllUnapprovedMetadata(
  keypair: string,
  env: string,
  cacheName: string
) {
  const creatorKeyPair = loadWalletKey(keypair);
  const anchorProgram = await loadAnchorProgram(creatorKeyPair, env);
  const cacheContent = loadCache(cacheName, env);

  return await scanForNFTMints(anchorProgram, cacheContent);
}

async function signWithRetry(anchorProgram: Program, creatorKeyPair: Keypair, metadataAddress: PublicKey) {
  await sendTransactionWithRetryWithKeypair(
    anchorProgram.provider.connection,
    creatorKeyPair,
    [signMetadataInstruction(metadataAddress, creatorKeyPair.publicKey)],
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

async function scanForNFTMints(anchorProgram, cacheContent) {
  const configAddress = new PublicKey(cacheContent.program.config);

  const [candyMachineAddress] = await getCandyMachineAddress(
    configAddress,
    cacheContent.program.uuid,
  );

  console.log(`candyMachineAddress = ${candyMachineAddress}`)

  const config = (await anchorProgram.account.config.fetch(
    configAddress,
  )) as Config;

  let slot = cacheContent.lastVerifiedSlot;
  let nftCounter = cacheContent.verifiedNfts || 0;

  console.log(`[${slot}] slot is the last checked. ${nftCounter} nfts have been verified before. starting scan`);

  for (; ;) {
    if (slot % 100 == 0) {
      console.log(`[${slot}] slot`);
    }


    let block;
    try {
      block = await anchorProgram.provider.connection.getBlock(slot);
    } catch {
      // error means the block isn't there, try the next one
      slot += 1;
      continue;
    }

    // we've reached the end of the chain, so break
    if (block.blockTime == null) {
      console.info(`[${slot}] end of chain...`);
      await sleep(SLEEP_AT_THE_END_OF_CHAIN);
      continue;
    }
    if (nftCounter >= config.data.maxNumberOfLines) {
      console.log("All verified, rejoice!");
      return;
    }

    for (const {transaction: {message}} of block.transactions) {
      if (isCandyMachineMintNftTx(message, candyMachineAddress)) {
        const mintKey = message.accountKeys[1];
        const metadataKey = await getMetadata(mintKey);

        if (!metadataKey.equals(message.accountKeys[5])) {
          console.error("someone is trying to cheat!");
          continue;
        }
        console.log(`[${slot}] new metadata key found:${metadataKey.toBase58()}`);
        console.log("[ ^^^^^^^^ ] mint keys is:", mintKey.toBase58());
        await signWithRetry(anchorProgram, anchorProgram.provider.wallet.payer, metadataKey);
        console.log("NFT signed!");
        nftCounter++;
      }
    }
    slot += 1;
    cacheContent.verifiedNfts = nftCounter;
    cacheContent.lastVerifiedSlot = slot;
    saveCache(cacheContent.cacheName, cacheContent.env, cacheContent);
  }
}

function isCandyMachineMintNftTx(message, candyMachineKey) {
  const hasProperLength = message.accountKeys.length == 15;
  const foundAccountKey = message.accountKeys
    .find(pk => pk.equals(candyMachineKey));

  return hasProperLength && foundAccountKey;


}
