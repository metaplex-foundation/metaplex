import log from 'loglevel';
import { createCandyMachineCoinfa } from '../helpers/accounts-coinfra';
import { PublicKey } from '@solana/web3.js';
import { BN, Program, web3 } from '@project-serum/anchor';

import { AssetKey } from '../types';
import { chunks } from '../helpers/various-coinfra';

export async function uploadCoinfra({
  totalNFTs,
  retainAuthority,
  mutable,
  batchSize,
  price,
  treasuryWallet,
  splToken,
  gatekeeper,
  goLiveDate,
  endSettings,
  whitelistMintSettings,
  hiddenSettings,
  uuid,
  wallet,
  publicKey,
  anchorProgram,
  manifest,
  metadataLink,
  imageLink,
  extention,
  filename,
}: {
  cacheName: string;
  env: string;
  totalNFTs: number;
  retainAuthority: boolean;
  mutable: boolean;
  batchSize: number;
  price: BN;
  treasuryWallet: PublicKey;
  splToken: PublicKey | null;
  gatekeeper: null | {
    expireOnUse: boolean;
    gatekeeperNetwork: web3.PublicKey;
  };
  goLiveDate: null | BN;
  endSettings: null | [number, BN];
  whitelistMintSettings: null | {
    mode: any;
    mint: PublicKey;
    presale: boolean;
    discountPrice: null | BN;
  };
  hiddenSettings: null | {
    name: string;
    uri: string;
    hash: Uint8Array;
  };
  uuid: string;
  wallet: any;
  publicKey: PublicKey;
  anchorProgram: Program;
  manifest: any;
  metadataLink: string;
  imageLink: string;
  extention: string;
  filename: string;
}): Promise<{
  uploadSuccessful: boolean;
  cacheContent: any;
  createCandyMachineTxId: string;
  addConfigLinesTxId: string;
}> {
  let uploadSuccessful = true;
  const cacheContent: any = {};

  if (!cacheContent.program) {
    cacheContent.program = {};
  }

  if (!cacheContent.items) {
    cacheContent.items = {};
  }

  const dedupedAssetKeys: AssetKey[] = [
    { mediaExt: extention, index: filename },
  ];
  const SIZE = dedupedAssetKeys.length;
  console.log('Size', SIZE, dedupedAssetKeys[0]);
  let candyMachine = cacheContent.program.candyMachine
    ? new PublicKey(cacheContent.program.candyMachine)
    : undefined;

  const tick = SIZE / 100; //print every one percent
  let lastPrinted = 0;

  let createCandyMachineTxId: string;
  await Promise.all(
    chunks(Array.from(Array(SIZE).keys()), batchSize || 50).map(
      async allIndexesInSlice => {
        for (let i = 0; i < allIndexesInSlice.length; i++) {
          const assetKey = dedupedAssetKeys[allIndexesInSlice[i]];
          if (
            allIndexesInSlice[i] >= lastPrinted + tick ||
            allIndexesInSlice[i] === 0
          ) {
            lastPrinted = i;
            log.info(`Processing asset: ${allIndexesInSlice[i]}`);
          }

          if (allIndexesInSlice[i] === 0 && !cacheContent.program.uuid) {
            try {
              const remainingAccounts = [];

              if (splToken) {
                const splTokenKey = new PublicKey(splToken);

                remainingAccounts.push({
                  pubkey: splTokenKey,
                  isWritable: false,
                  isSigner: false,
                });
              }

              // initialize candy
              log.info(`initializing candy machine`);
              const res = await createCandyMachineCoinfa(
                anchorProgram,
                wallet,
                publicKey,
                treasuryWallet,
                splToken,
                {
                  itemsAvailable: new BN(totalNFTs),
                  uuid,
                  symbol: manifest.symbol,
                  sellerFeeBasisPoints: manifest.seller_fee_basis_points,
                  isMutable: mutable,
                  maxSupply: new BN(0),
                  retainAuthority: retainAuthority,
                  gatekeeper,
                  goLiveDate,
                  price,
                  endSettings,
                  whitelistMintSettings,
                  hiddenSettings,
                  creators: manifest.properties.creators.map(creator => {
                    return {
                      address: new PublicKey(creator.address),
                      verified: true,
                      share: creator.share,
                    };
                  }),
                },
              );
              cacheContent.program.uuid = res.uuid;
              cacheContent.program.candyMachine = res.candyMachine.toBase58();
              candyMachine = res.candyMachine;
              createCandyMachineTxId = res.txId;
              log.info(
                `initialized config for a candy machine with publickey: ${res.candyMachine.toBase58()}`,
              );
            } catch (exx) {
              log.error('Error deploying config to Solana network.', exx);
              throw exx;
            }
          }

          if (
            allIndexesInSlice[i] >= lastPrinted + tick ||
            allIndexesInSlice[i] === 0
          ) {
            lastPrinted = allIndexesInSlice[i];
            log.info(`Processing asset: ${allIndexesInSlice[i]}`);
          }

          try {
            if (metadataLink && imageLink) {
              log.debug('Updating cache for ', allIndexesInSlice[i]);
              cacheContent.items[assetKey.index] = {
                link: metadataLink,
                imageLink,
                name: manifest.name,
                onChain: false,
              };
            }
          } catch (err) {
            log.error(`Error uploading file ${assetKey}`, err);
            i--;
          }
        }
      },
    ),
  );
  let addConfigLinesTxId: string;
  const keys = Object.keys(cacheContent.items);
  if (hiddenSettings) {
    log.info('Skipping upload to chain as this is a hidden Candy Machine');
  } else {
    try {
      await Promise.all(
        chunks(Array.from(Array(keys.length).keys()), 1000).map(
          async allIndexesInSlice => {
            for (
              let offset = 0;
              offset < allIndexesInSlice.length;
              offset += 10
            ) {
              const indexes = allIndexesInSlice.slice(offset, offset + 10);
              const onChain = indexes.filter(i => {
                const index = keys[i];
                return cacheContent.items[index]?.onChain || false;
              });
              const ind = keys[indexes[0]];

              if (onChain.length != indexes.length) {
                log.info(
                  `Writing indices ${ind}-${keys[indexes[indexes.length - 1]]}`,
                );
                try {
                  addConfigLinesTxId = await anchorProgram.rpc.addConfigLines(
                    ind,
                    indexes.map(i => ({
                      uri: cacheContent.items[keys[i]].link,
                      name: cacheContent.items[keys[i]].name,
                    })),
                    {
                      accounts: {
                        candyMachine,
                        authority: publicKey,
                      },
                      // signers: [wallet], // ここにwalletを入れたらエラー
                    },
                  );
                  indexes.forEach(i => {
                    cacheContent.items[keys[i]] = {
                      ...cacheContent.items[keys[i]],
                      onChain: true,
                    };
                  });
                } catch (e) {
                  log.error(
                    `saving config line ${ind}-${
                      keys[indexes[indexes.length - 1]]
                    } failed`,
                    e,
                  );
                  uploadSuccessful = false;
                }
              }
            }
          },
        ),
      );
    } catch (e) {
      log.error(e);
    }
  }
  console.log(`Done. Successful = ${uploadSuccessful}.`);
  return {
    uploadSuccessful,
    cacheContent,
    createCandyMachineTxId,
    addConfigLinesTxId,
  };
}
