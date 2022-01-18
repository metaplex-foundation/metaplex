import fs from 'fs/promises'
import path from 'path'
import { NFTStorageMetaplexor, prepareMetaplexNFT } from '@nftstorage/metaplex-auth';
import { File } from '@web-std/file';
import type { Keypair } from '@solana/web3.js';

export async function nftStorageUpload(
  walletKeypair: Keypair,
  clusterEnv: string,
  imagePath: string,
  manifest: Record<string, any>,
): Promise<[string, string]> {
  const endpoint = process.env.NFT_STORAGE_ENDPOINT
    ? new URL(process.env.NFT_STORAGE_ENDPOINT)
    : undefined;

  const metaplexor = NFTStorageMetaplexor.withSecretKey(walletKeypair.secretKey, {
    solanaCluster: clusterEnv,
    endpoint,
  });

  const imageFile = await fileFromPath(imagePath)
  const nft = await prepareMetaplexNFT(manifest, imageFile)
  const result = await metaplexor.storePreparedNFT(nft)
  return [result.metadataGatewayURL, result.metadata['image']];
}


async function fileFromPath(filePath: string): Promise<File> {
  const content = await fs.readFile(filePath)
  const filename = path.basename(filePath)
  return new File([content], filename)
}
