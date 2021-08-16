import { SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { serialize } from 'borsh';
import { SCHEMA } from '.';
import { getAuctionExtended, VAULT_PREFIX } from '../../actions';
import {
  findProgramAddress,
  programIds,
  StringPublicKey,
  toPublicKey,
} from '../../utils';
import { DeprecatedPopulateParticipationPrintingAccountArgs } from './deprecatedStates';

export async function deprecatedPopulateParticipationPrintingAccount(
  vault: StringPublicKey,
  auctionManager: StringPublicKey,
  auction: StringPublicKey,
  safetyDepositTokenStore: StringPublicKey,
  transientOneTimeAccount: StringPublicKey,
  printingTokenAccount: StringPublicKey,
  safetyDeposit: StringPublicKey,
  fractionMint: StringPublicKey,
  printingMint: StringPublicKey,
  oneTimePrintingAuthorizationMint: StringPublicKey,
  masterEdition: StringPublicKey,
  metadata: StringPublicKey,
  payer: StringPublicKey,
  instructions: TransactionInstruction[],
) {
  const PROGRAM_IDS = programIds();
  const store = PROGRAM_IDS.store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  const transferAuthority = (
    await findProgramAddress(
      [
        Buffer.from(VAULT_PREFIX),
        toPublicKey(PROGRAM_IDS.vault).toBuffer(),
        toPublicKey(vault).toBuffer(),
      ],
      toPublicKey(PROGRAM_IDS.vault),
    )
  )[0];

  const value = new DeprecatedPopulateParticipationPrintingAccountArgs();
  const data = Buffer.from(serialize(SCHEMA, value));

  const keys = [
    {
      pubkey: toPublicKey(safetyDepositTokenStore),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(transientOneTimeAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(printingTokenAccount),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(oneTimePrintingAuthorizationMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(printingMint),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(safetyDeposit),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(vault),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: toPublicKey(fractionMint),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auction),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(
        await getAuctionExtended({
          auctionProgramId: PROGRAM_IDS.auction,
          resource: vault,
        }),
      ),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(auctionManager),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: PROGRAM_IDS.token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.vault),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(PROGRAM_IDS.metadata),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: store,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(masterEdition),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(metadata),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(transferAuthority),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: toPublicKey(payer),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];

  instructions.push(
    new TransactionInstruction({
      keys,
      programId: toPublicKey(PROGRAM_IDS.metaplex),
      data,
    }),
  );
}
