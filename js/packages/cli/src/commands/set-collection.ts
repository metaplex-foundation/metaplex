import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  getCollectionAuthorityRecordPDA,
  getCollectionPDA,
  getMasterEdition,
  getMetadata,
} from '../helpers/accounts';
import { TOKEN_METADATA_PROGRAM_ID } from '../helpers/constants';
import * as anchor from '@project-serum/anchor';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  MintLayout,
  Token,
} from '@solana/spl-token';
import { sendTransactionWithRetryWithKeypair } from '../helpers/transactions';
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
  DataV2,
} from '@metaplex-foundation/mpl-token-metadata';
import log from 'loglevel';
import { Program } from '@project-serum/anchor';
import { parseCollectionMintPubkey } from '../helpers/various';

export async function setCollection(
  walletKeyPair: anchor.web3.Keypair,
  anchorProgram: Program,
  candyMachineAddress: PublicKey,
  collectionMint: null | PublicKey,
) {
  const signers = [walletKeyPair];
  const wallet = new anchor.Wallet(walletKeyPair);
  const instructions = [];
  let mintPubkey: PublicKey;
  let metadataPubkey: PublicKey;
  let masterEditionPubkey: PublicKey;
  let collectionPDAPubkey: PublicKey;
  let collectionAuthorityRecordPubkey: PublicKey;

  const candyMachine: any = await anchorProgram.account.candyMachine.fetch(
    candyMachineAddress,
  );
  if (!collectionMint) {
    const mint = anchor.web3.Keypair.generate();
    mintPubkey = mint.publicKey;
    metadataPubkey = await getMetadata(mintPubkey);
    masterEditionPubkey = await getMasterEdition(mintPubkey);
    [collectionPDAPubkey] = await getCollectionPDA(candyMachineAddress);
    [collectionAuthorityRecordPubkey] = await getCollectionAuthorityRecordPDA(
      mintPubkey,
      collectionPDAPubkey,
    );
    signers.push(mint);
    const userTokenAccountAddress = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      mint.publicKey,
      wallet.publicKey,
    );

    instructions.push(
      ...[
        anchor.web3.SystemProgram.createAccount({
          fromPubkey: wallet.publicKey,
          newAccountPubkey: mintPubkey,
          space: MintLayout.span,
          lamports:
            await anchorProgram.provider.connection.getMinimumBalanceForRentExemption(
              MintLayout.span,
            ),
          programId: TOKEN_PROGRAM_ID,
        }),
        Token.createInitMintInstruction(
          TOKEN_PROGRAM_ID,
          mintPubkey,
          0,
          wallet.publicKey,
          wallet.publicKey,
        ),
        Token.createAssociatedTokenAccountInstruction(
          ASSOCIATED_TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          mintPubkey,
          userTokenAccountAddress,
          wallet.publicKey,
          wallet.publicKey,
        ),
        Token.createMintToInstruction(
          TOKEN_PROGRAM_ID,
          mintPubkey,
          userTokenAccountAddress,
          wallet.publicKey,
          [],
          1,
        ),
      ],
    );
    const data = new DataV2({
      symbol: candyMachine.data.symbol ?? '',
      name: 'Collection NFT',
      uri: '',
      sellerFeeBasisPoints: candyMachine.data.seller_fee_basis_points,
      creators: [
        new Creator({
          address: wallet.publicKey.toBase58(),
          verified: true,
          share: 100,
        }),
      ],
      collection: null,
      uses: null,
    });

    instructions.push(
      ...new CreateMetadataV2(
        { feePayer: wallet.publicKey },
        {
          metadata: metadataPubkey,
          metadataData: data,
          updateAuthority: wallet.publicKey,
          mint: mintPubkey,
          mintAuthority: wallet.publicKey,
        },
      ).instructions,
    );

    instructions.push(
      ...new CreateMasterEditionV3(
        {
          feePayer: wallet.publicKey,
        },
        {
          edition: masterEditionPubkey,
          metadata: metadataPubkey,
          mint: mintPubkey,
          mintAuthority: wallet.publicKey,
          updateAuthority: wallet.publicKey,
          maxSupply: new anchor.BN(0),
        },
      ).instructions,
    );
  } else {
    mintPubkey = await parseCollectionMintPubkey(
      collectionMint,
      anchorProgram.provider.connection,
      walletKeyPair,
    );
    metadataPubkey = await getMetadata(mintPubkey);
    masterEditionPubkey = await getMasterEdition(mintPubkey);
    [collectionPDAPubkey] = await getCollectionPDA(candyMachineAddress);
    [collectionAuthorityRecordPubkey] = await getCollectionAuthorityRecordPDA(
      mintPubkey,
      collectionPDAPubkey,
    );
  }

  instructions.push(
    await anchorProgram.instruction.setCollection({
      accounts: {
        candyMachine: candyMachineAddress,
        authority: wallet.publicKey,
        collectionPda: collectionPDAPubkey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        metadata: metadataPubkey,
        mint: mintPubkey,
        edition: masterEditionPubkey,
        collectionAuthorityRecord: collectionAuthorityRecordPubkey,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      },
    }),
  );

  log.info('Candy machine address: ', candyMachineAddress.toBase58());
  log.info('Collection metadata address: ', metadataPubkey.toBase58());
  log.info('Collection metadata authority: ', wallet.publicKey.toBase58());
  log.info(
    'Collection master edition address: ',
    masterEditionPubkey.toBase58(),
  );
  log.info('Collection mint address: ', mintPubkey.toBase58());
  log.info('Collection PDA address: ', collectionPDAPubkey.toBase58());
  log.info(
    'Collection authority record address: ',
    collectionAuthorityRecordPubkey.toBase58(),
  );

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
