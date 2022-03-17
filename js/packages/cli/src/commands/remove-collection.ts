import { PublicKey } from '@solana/web3.js';
import {
  getCollectionAuthorityRecordPDA,
  getCollectionPDA,
  getMetadata,
} from '../helpers/accounts';
import { TOKEN_METADATA_PROGRAM_ID } from '../helpers/constants';
import * as anchor from '@project-serum/anchor';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import log from 'loglevel';
import { Program } from '@project-serum/anchor';
import { CollectionData } from '../types';

export async function removeCollection(
  walletKeyPair: anchor.web3.Keypair,
  anchorProgram: Program,
  candyMachineAddress: PublicKey,
) {
  const wallet = new anchor.Wallet(walletKeyPair);
  const signers = [walletKeyPair];
  const [collectionPDAPubkey] = await getCollectionPDA(candyMachineAddress);
  const collectionPDAAccount =
    await anchorProgram.provider.connection.getAccountInfo(collectionPDAPubkey);
  if (!collectionPDAAccount) {
    throw new Error(
      'Candy machine does not have a collection associated with it. You can add a collection using the set_collection command.',
    );
  }
  const collectionMint = (await anchorProgram.account.collectionPda.fetch(
    collectionPDAPubkey,
  )) as CollectionData;
  const mint = collectionMint.mint;

  const metadataPubkey = await getMetadata(mint);
  const [collectionAuthorityRecordPubkey] =
    await getCollectionAuthorityRecordPDA(mint, collectionPDAPubkey);

  log.info('Candy machine address: ', candyMachineAddress.toBase58());
  log.info('Authority address: ', wallet.publicKey.toBase58());
  log.info('Collection PDA address: ', collectionPDAPubkey.toBase58());
  log.info('Metadata address: ', metadataPubkey.toBase58());
  log.info('Mint address: ', mint.toBase58());
  log.info(
    'Collection authority record address: ',
    collectionAuthorityRecordPubkey.toBase58(),
  );
  const instructions = [
    await anchorProgram.instruction.removeCollection({
      accounts: {
        candyMachine: candyMachineAddress,
        authority: wallet.publicKey,
        collectionPda: collectionPDAPubkey,
        metadata: metadataPubkey,
        mint: mint,
        collectionAuthorityRecord: collectionAuthorityRecordPubkey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      },
    }),
  ];

  const txId = (
    await sendTransactionWithRetryWithKeypair(
      anchorProgram.provider.connection,
      walletKeyPair,
      instructions,
      signers,
    )
  ).txid;
  const toReturn = {
    collectionMetadata: metadataPubkey.toBase58(),
    collectionPDA: collectionPDAPubkey.toBase58(),
    txId,
  };
  return toReturn;
}
