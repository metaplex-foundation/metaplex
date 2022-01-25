import { createCandyMachineCoinfra } from '../helpers/accounts-coinfra';
import { chunks } from '../helpers/various-coinfra';
import { sendSignedTransaction } from '../helpers/transactions-coinfra';
import { PublicKey, Transaction } from '@solana/web3.js';
import { BN, Program, web3 } from '@project-serum/anchor';
import type { SendTxRequest } from '@project-serum/anchor/dist/cjs/provider';

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
  anchorProgram,
  manifests,
  metadataLinks,
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
  anchorProgram: Program;
  manifests: any[];
  metadataLinks: string;
}): Promise<{
  uploadSuccessful: boolean;
  cacheContent: any;
}> {
  let uploadSuccessful = true;
  const cacheContent: any = { program: {}, items: {} };

  const SIZE = manifests.length;

  if (SIZE === 0 || manifests.length === 0) {
    const error = new Error('Error dedupedAssetKeys or manifests is invalid');
    console.error(error.message);
    throw error;
  }

  const firstAssetManifest = manifests[0];

  const transactions: Transaction[] = [];
  let candyMachine;
  const txs: Array<SendTxRequest> = [];
  try {
    if (
      !firstAssetManifest.properties?.creators?.every(
        creator => creator.address !== undefined,
      )
    ) {
      throw new Error('Creator address is missing');
    }

    // initialize candy
    console.log(`initializing candy machine`);
    const res = await createCandyMachineCoinfra(
      anchorProgram,
      wallet,
      treasuryWallet,
      splToken,
      {
        itemsAvailable: new BN(totalNFTs),
        uuid,
        symbol: firstAssetManifest.symbol,
        sellerFeeBasisPoints: firstAssetManifest.seller_fee_basis_points,
        isMutable: mutable,
        maxSupply: new BN(0),
        retainAuthority: retainAuthority,
        gatekeeper,
        goLiveDate,
        price,
        endSettings,
        whitelistMintSettings,
        hiddenSettings,
        creators: firstAssetManifest.properties.creators.map(creator => {
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
    transactions.push(res.transaction);
    txs.push({ tx: res.transaction, signers: [res.candyAccount] });

    console.info(
      `initialized config for a candy machine with publickey: ${res.candyMachine.toBase58()}`,
    );
  } catch (error) {
    console.error('Error deploying config to Solana network.', error);
    throw error;
  }

  console.log('Uploading Size', SIZE, firstAssetManifest);

  // add config to cacheContent.items
  await Promise.all(
    chunks(Array.from(Array(SIZE).keys()), batchSize || 50).map(
      async allIndexesInSlice => {
        for (let i = 0; i < allIndexesInSlice.length; i++) {
          const manifest = manifests[allIndexesInSlice[i]];
          const metadataLink = metadataLinks[allIndexesInSlice[i]];

          console.debug('Updating cache for ', allIndexesInSlice[i]);
          cacheContent.items[allIndexesInSlice[i]] = {
            link: metadataLink,
            name: manifest.name,
            onChain: false,
          };
        }
      },
    ),
  );

  const keys = Object.keys(cacheContent.items);
  if (!hiddenSettings) {
    try {
      // add coinfig to candy machine from cacheContent.items
      await Promise.all(
        chunks(Array.from(Array(keys.length).keys()), 1000).map(
          async allIndexesInSlice => {
            // if this value is large, "RangeError: encoding overruns Buffer" occur
            const bachsize = 5;
            for (
              let offset = 0;
              offset < allIndexesInSlice.length;
              offset += bachsize
            ) {
              const indexes = allIndexesInSlice.slice(
                offset,
                offset + bachsize,
              );
              const onChain = indexes.filter(i => {
                const index = keys[i];
                return cacheContent.items[index]?.onChain || false;
              });
              const ind = keys[indexes[0]];

              if (onChain.length != indexes.length) {
                console.info(
                  `Writing indices ${ind}-${keys[indexes[indexes.length - 1]]}`,
                );
                try {
                  const transaction = anchorProgram.transaction.addConfigLines(
                    ind,
                    indexes.map(i => {
                      return {
                        uri: cacheContent.items[keys[i]].link,
                        name: cacheContent.items[keys[i]].name,
                      };
                    }),
                    {
                      accounts: {
                        candyMachine,
                        authority: wallet.publicKey,
                      },
                    },
                  );
                  transaction.feePayer = wallet.publicKey;
                  transaction.recentBlockhash = (
                    await anchorProgram.provider.connection.getRecentBlockhash(
                      'singleGossip',
                    )
                  ).blockhash;
                  transactions.push(transaction);
                  indexes.forEach(i => {
                    cacheContent.items[keys[i]] = {
                      ...cacheContent.items[keys[i]],
                      onChain: true,
                      verifyRun: false,
                    };
                  });
                  txs.push({ tx: transaction, signers: [] });
                } catch (error) {
                  console.error(
                    `saving config line ${ind}-${
                      keys[indexes[indexes.length - 1]]
                    } failed`,
                    error,
                  );
                  uploadSuccessful = false;
                }
              }
            }
          },
        ),
      );

      // const signers = [candyAccount];
      //const allTxs = [];
      await anchorProgram.provider.sendAll(txs, {
        // preflightCommitment: 'singleGossip',
        skipPreflight: true,
      });

      /*
      const signedTransactions = await wallet.signAllTransactions(transactions);
      for (let i = 0; i < signedTransactions.length; i++) {
        try {
          await sendSignedTransaction({
            connection: anchorProgram.provider.connection,
            signedTransaction: signedTransactions[i],
          });
        } catch (e) {
          console.log('Caught failure', e);
        }
      }
      */
    } catch (error) {
      uploadSuccessful = false;
      console.error(error);
    }
  } else {
    console.info('Skipping upload to chain as this is a hidden Candy Machine');
  }

  console.log(`Done. Successful = ${uploadSuccessful}.`);
  return {
    uploadSuccessful,
    cacheContent,
  };
}
