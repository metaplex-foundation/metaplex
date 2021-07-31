import {
  Keypair,
  Connection,
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from '@solana/web3.js';
import {
  actions,
  Metadata,
  ParsedAccount,
  MasterEditionV1,
  MasterEditionV2,
  SequenceType,
  sendTransactions,
  getSafetyDepositBox,
  Edition,
  getEdition,
  programIds,
  Creator,
  getSafetyDepositBoxAddress,
  createAssociatedTokenAccountInstruction,
  sendTransactionWithRetry,
  findProgramAddress,
  IPartialCreateAuctionArgs,
  MetadataKey,
} from '@oyster/common';

import { AccountLayout, Token } from '@solana/spl-token';
import BN from 'bn.js';
import {
  WinningConfigType,
  getAuctionKeys,
  getWhitelistedCreator,
  startAuction,
  WhitelistedCreator,
  AmountRange,
  ParticipationConfigV2,
  TupleNumericType,
  SafetyDepositConfig,
} from '../models/metaplex';
import { createVault } from './createVault';
import { closeVault } from './closeVault';
import {
  addTokensToVault,
  SafetyDepositInstructionTemplate,
} from './addTokensToVault';
import { makeAuction } from './makeAuction';
import { createExternalPriceAccount } from './createExternalPriceAccount';
import { deprecatedValidateParticipation } from '../models/metaplex/deprecatedValidateParticipation';
import { deprecatedCreateReservationListForTokens } from './deprecatedCreateReservationListsForTokens';
import { deprecatedPopulatePrintingTokens } from './deprecatedPopulatePrintingTokens';
import { setVaultAndAuctionAuthorities } from './setVaultAndAuctionAuthorities';
import { markItemsThatArentMineAsSold } from './markItemsThatArentMineAsSold';
import { validateSafetyDepositBoxV2 } from '../models/metaplex/validateSafetyDepositBoxV2';
import { initAuctionManagerV2 } from '../models/metaplex/initAuctionManagerV2';
const { createTokenAccount } = actions;

interface normalPattern {
  instructions: TransactionInstruction[];
  signers: Keypair[];
}

interface arrayPattern {
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}
interface byType {
  markItemsThatArentMineAsSold: arrayPattern;
  addTokens: arrayPattern;
  deprecatedCreateReservationList: arrayPattern;
  validateBoxes: arrayPattern;
  createVault: normalPattern;
  closeVault: normalPattern;
  makeAuction: normalPattern;
  initAuctionManager: normalPattern;
  startAuction: normalPattern;
  setVaultAndAuctionAuthorities: normalPattern;
  externalPriceAccount: normalPattern;
  deprecatedValidateParticipation?: normalPattern;
  deprecatedBuildAndPopulateOneTimeAuthorizationAccount?: normalPattern;
  deprecatedPopulatePrintingTokens: arrayPattern;
}

export interface SafetyDepositDraft {
  metadata: ParsedAccount<Metadata>;
  masterEdition?: ParsedAccount<MasterEditionV1 | MasterEditionV2>;
  edition?: ParsedAccount<Edition>;
  holding: PublicKey;
  printingMintHolding?: PublicKey;
  winningConfigType: WinningConfigType;
  amountRanges: AmountRange[];
  participationConfig?: ParticipationConfigV2;
}

// This is a super command that executes many transactions to create a Vault, Auction, and AuctionManager starting
// from some AuctionManagerSettings.
export async function createAuctionManager(
  connection: Connection,
  wallet: any,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  auctionSettings: IPartialCreateAuctionArgs,
  safetyDepositDrafts: SafetyDepositDraft[],
  participationSafetyDepositDraft: SafetyDepositDraft | undefined,
  paymentMint: PublicKey,
): Promise<{
  vault: PublicKey;
  auction: PublicKey;
  auctionManager: PublicKey;
}> {
  const accountRentExempt = await connection.getMinimumBalanceForRentExemption(
    AccountLayout.span,
  );

  const {
    externalPriceAccount,
    priceMint,
    instructions: epaInstructions,
    signers: epaSigners,
  } = await createExternalPriceAccount(connection, wallet);

  const {
    instructions: createVaultInstructions,
    signers: createVaultSigners,
    vault,
    fractionalMint,
    redeemTreasury,
    fractionTreasury,
  } = await createVault(connection, wallet, priceMint, externalPriceAccount);

  const {
    instructions: makeAuctionInstructions,
    signers: makeAuctionSigners,
    auction,
  } = await makeAuction(wallet, vault, auctionSettings);

  let safetyDepositConfigsWithPotentiallyUnsetTokens =
    await buildSafetyDepositArray(
      wallet,
      safetyDepositDrafts,
      participationSafetyDepositDraft,
    );

  // Only creates for PrintingV1 deprecated configs
  const {
    instructions: populateInstr,
    signers: populateSigners,
    safetyDepositConfigs,
  } = await deprecatedPopulatePrintingTokens(
    connection,
    wallet,
    safetyDepositConfigsWithPotentiallyUnsetTokens,
  );

  const {
    instructions: auctionManagerInstructions,
    signers: auctionManagerSigners,
    auctionManager,
  } = await setupAuctionManagerInstructions(
    wallet,
    vault,
    paymentMint,
    accountRentExempt,
    safetyDepositConfigs,
    auctionSettings,
  );

  const {
    instructions: addTokenInstructions,
    signers: addTokenSigners,
    safetyDepositTokenStores,
  } = await addTokensToVault(connection, wallet, vault, safetyDepositConfigs);

  // Only creates for deprecated PrintingV1 configs
  const {
    instructions: createReservationInstructions,
    signers: createReservationSigners,
  } = await deprecatedCreateReservationListForTokens(
    wallet,
    auctionManager,
    safetyDepositConfigs,
  );

  let lookup: byType = {
    markItemsThatArentMineAsSold: await markItemsThatArentMineAsSold(
      wallet,
      safetyDepositDrafts,
    ),
    externalPriceAccount: {
      instructions: epaInstructions,
      signers: epaSigners,
    },
    createVault: {
      instructions: createVaultInstructions,
      signers: createVaultSigners,
    },
    closeVault: await closeVault(
      connection,
      wallet,
      vault,
      fractionalMint,
      fractionTreasury,
      redeemTreasury,
      priceMint,
      externalPriceAccount,
    ),
    addTokens: { instructions: addTokenInstructions, signers: addTokenSigners },
    deprecatedCreateReservationList: {
      instructions: createReservationInstructions,
      signers: createReservationSigners,
    },
    makeAuction: {
      instructions: makeAuctionInstructions,
      signers: makeAuctionSigners,
    },
    initAuctionManager: {
      instructions: auctionManagerInstructions,
      signers: auctionManagerSigners,
    },
    setVaultAndAuctionAuthorities: await setVaultAndAuctionAuthorities(
      wallet,
      vault,
      auction,
      auctionManager,
    ),
    startAuction: await setupStartAuction(wallet, vault),
    deprecatedValidateParticipation: participationSafetyDepositDraft
      ? await deprecatedValidateParticipationHelper(
          wallet,
          auctionManager,
          whitelistedCreatorsByCreator,
          vault,
          safetyDepositTokenStores[safetyDepositTokenStores.length - 1], // The last one is always the participation
          participationSafetyDepositDraft,
          accountRentExempt,
        )
      : undefined,
    deprecatedBuildAndPopulateOneTimeAuthorizationAccount:
      participationSafetyDepositDraft
        ? await deprecatedBuildAndPopulateOneTimeAuthorizationAccount(
            connection,
            wallet,
            (
              participationSafetyDepositDraft?.masterEdition as ParsedAccount<MasterEditionV1>
            )?.info.oneTimePrintingAuthorizationMint,
          )
        : undefined,
    validateBoxes: await validateBoxes(
      wallet,
      whitelistedCreatorsByCreator,
      vault,
      // Participation NFTs validate differently, with above
      safetyDepositConfigs.filter(
        c =>
          !participationSafetyDepositDraft ||
          // Only V1s need to skip normal validation and use special endpoint
          (participationSafetyDepositDraft.masterEdition?.info.key ==
            MetadataKey.MasterEditionV1 &&
            !c.draft.metadata.pubkey.equals(
              participationSafetyDepositDraft.metadata.pubkey,
            )) ||
          participationSafetyDepositDraft.masterEdition?.info.key ==
            MetadataKey.MasterEditionV2,
      ),
      safetyDepositTokenStores,
    ),
    deprecatedPopulatePrintingTokens: {
      instructions: populateInstr,
      signers: populateSigners,
    },
  };

  let signers: Keypair[][] = [
    ...lookup.markItemsThatArentMineAsSold.signers,
    lookup.externalPriceAccount.signers,
    lookup.deprecatedBuildAndPopulateOneTimeAuthorizationAccount?.signers || [],
    ...lookup.deprecatedPopulatePrintingTokens.signers,
    lookup.createVault.signers,
    ...lookup.addTokens.signers,
    ...lookup.deprecatedCreateReservationList.signers,
    lookup.closeVault.signers,
    lookup.makeAuction.signers,
    lookup.initAuctionManager.signers,
    lookup.setVaultAndAuctionAuthorities.signers,
    lookup.deprecatedValidateParticipation?.signers || [],
    ...lookup.validateBoxes.signers,
    lookup.startAuction.signers,
  ];
  const toRemoveSigners: Record<number, boolean> = {};
  let instructions: TransactionInstruction[][] = [
    ...lookup.markItemsThatArentMineAsSold.instructions,
    lookup.externalPriceAccount.instructions,
    lookup.deprecatedBuildAndPopulateOneTimeAuthorizationAccount
      ?.instructions || [],
    ...lookup.deprecatedPopulatePrintingTokens.instructions,
    lookup.createVault.instructions,
    ...lookup.addTokens.instructions,
    ...lookup.deprecatedCreateReservationList.instructions,
    lookup.closeVault.instructions,
    lookup.makeAuction.instructions,
    lookup.initAuctionManager.instructions,
    lookup.setVaultAndAuctionAuthorities.instructions,
    lookup.deprecatedValidateParticipation?.instructions || [],
    ...lookup.validateBoxes.instructions,
    lookup.startAuction.instructions,
  ].filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });

  let filteredSigners = signers.filter((_, i) => !toRemoveSigners[i]);

  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength = null;
  while (stopPoint < instructions.length && tries < 3) {
    instructions = instructions.slice(stopPoint, instructions.length);
    filteredSigners = filteredSigners.slice(stopPoint, filteredSigners.length);

    if (instructions.length === lastInstructionsLength) tries = tries + 1;
    else tries = 0;

    try {
      if (instructions.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructions[0],
          filteredSigners[0],
          'single',
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructions,
          filteredSigners,
          SequenceType.StopOnFailure,
          'single',
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructions[stopPoint],
      'instructions length is',
      instructions.length,
    );
    lastInstructionsLength = instructions.length;
  }

  if (stopPoint < instructions.length) throw new Error('Failed to create');

  return { vault, auction, auctionManager };
}

async function buildSafetyDepositArray(
  wallet: any,
  safetyDeposits: SafetyDepositDraft[],
  participationSafetyDepositDraft: SafetyDepositDraft | undefined,
): Promise<SafetyDepositInstructionTemplate[]> {
  let safetyDepositTemplates: SafetyDepositInstructionTemplate[] = [];
  safetyDeposits.forEach((s, i) => {
    const maxAmount = [...s.amountRanges.map(a => a.amount)]
      .sort()
      .reverse()[0];

    const maxLength = [...s.amountRanges.map(a => a.length)]
      .sort()
      .reverse()[0];
    safetyDepositTemplates.push({
      box: {
        tokenAccount:
          s.winningConfigType !== WinningConfigType.PrintingV1
            ? s.holding
            : s.printingMintHolding,
        tokenMint:
          s.winningConfigType !== WinningConfigType.PrintingV1
            ? s.metadata.info.mint
            : (s.masterEdition as ParsedAccount<MasterEditionV1>)?.info
                .printingMint,
        amount:
          s.winningConfigType == WinningConfigType.PrintingV2 ||
          s.winningConfigType == WinningConfigType.FullRightsTransfer
            ? new BN(1)
            : new BN(
                s.amountRanges.reduce(
                  (acc, r) => acc.add(r.amount.mul(r.length)),
                  new BN(0),
                ),
              ),
      },
      config: new SafetyDepositConfig({
        directArgs: {
          auctionManager: SystemProgram.programId,
          order: new BN(i),
          amountRanges: s.amountRanges,
          amountType: maxAmount.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8,
          lengthType: maxLength.gte(new BN(254))
            ? TupleNumericType.U16
            : TupleNumericType.U8,
          winningConfigType: s.winningConfigType,
          participationConfig: null,
          participationState: null,
        },
      }),
      draft: s,
    });
  });
  console.log('templates', safetyDepositTemplates);
  if (
    participationSafetyDepositDraft &&
    participationSafetyDepositDraft.masterEdition
  ) {
    const maxAmount = [
      ...participationSafetyDepositDraft.amountRanges.map(s => s.amount),
    ]
      .sort()
      .reverse()[0];
    const maxLength = [
      ...participationSafetyDepositDraft.amountRanges.map(s => s.length),
    ]
      .sort()
      .reverse()[0];
    const config = new SafetyDepositConfig({
      directArgs: {
        auctionManager: SystemProgram.programId,
        order: new BN(safetyDeposits.length),
        amountRanges: participationSafetyDepositDraft.amountRanges,
        amountType: maxAmount.gte(new BN(255))
          ? TupleNumericType.U32
          : TupleNumericType.U8,
        lengthType: maxLength.gte(new BN(255))
          ? TupleNumericType.U32
          : TupleNumericType.U8,
        winningConfigType: WinningConfigType.PrintingV1,
        participationConfig:
          participationSafetyDepositDraft.participationConfig || null,
        participationState: { collectedToAcceptPayment: new BN(0) },
      },
    });

    if (
      participationSafetyDepositDraft.masterEdition.info.key ==
      MetadataKey.MasterEditionV1
    ) {
      const me =
        participationSafetyDepositDraft.masterEdition as ParsedAccount<MasterEditionV1>;
      safetyDepositTemplates.push({
        box: {
          tokenAccount: (
            await findProgramAddress(
              [
                wallet.publicKey.toBuffer(),
                programIds().token.toBuffer(),
                me?.info.oneTimePrintingAuthorizationMint.toBuffer(),
              ],
              programIds().associatedToken,
            )
          )[0],
          tokenMint: me?.info.oneTimePrintingAuthorizationMint,
          amount: new BN(1),
        },
        config,
        draft: participationSafetyDepositDraft,
      });
    } else {
      safetyDepositTemplates.push({
        box: {
          tokenAccount: participationSafetyDepositDraft.holding,
          tokenMint: participationSafetyDepositDraft.metadata.info.mint,
          amount: new BN(1),
        },
        config,
        draft: participationSafetyDepositDraft,
      });
    }
  }

  return safetyDepositTemplates;
}

async function setupAuctionManagerInstructions(
  wallet: any,
  vault: PublicKey,
  paymentMint: PublicKey,
  accountRentExempt: number,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  auctionSettings: IPartialCreateAuctionArgs,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
  auctionManager: PublicKey;
}> {
  let store = programIds().store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  const { auctionManagerKey } = await getAuctionKeys(vault);

  const acceptPayment = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    paymentMint,
    auctionManagerKey,
    signers,
  );

  let maxRanges = [
    auctionSettings.winners.usize.toNumber(),
    safetyDeposits.length,
    100,
  ].sort()[0];
  if (maxRanges < 10) {
    maxRanges = 10;
  }

  await initAuctionManagerV2(
    vault,
    wallet.publicKey,
    wallet.publicKey,
    acceptPayment,
    store,
    safetyDeposits.length >= 254 ? TupleNumericType.U16 : TupleNumericType.U8,
    auctionSettings.winners.usize.toNumber() >= 254
      ? TupleNumericType.U16
      : TupleNumericType.U8,
    new BN(maxRanges),
    instructions,
  );

  return { instructions, signers, auctionManager: auctionManagerKey };
}

async function setupStartAuction(
  wallet: any,
  vault: PublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];

  await startAuction(vault, wallet.publicKey, instructions);

  return { instructions, signers };
}

async function deprecatedValidateParticipationHelper(
  wallet: any,
  auctionManager: PublicKey,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: PublicKey,
  tokenStore: PublicKey,
  participationSafetyDepositDraft: SafetyDepositDraft,
  accountRentExempt: number,
): Promise<{ instructions: TransactionInstruction[]; signers: Keypair[] }> {
  const store = programIds().store;
  if (!store) {
    throw new Error('Store not initialized');
  }

  let instructions: TransactionInstruction[] = [];
  let signers: Keypair[] = [];
  const whitelistedCreator = participationSafetyDepositDraft.metadata.info.data
    .creators
    ? await findValidWhitelistedCreator(
        whitelistedCreatorsByCreator,
        //@ts-ignore
        participationSafetyDepositDraft.metadata.info.data.creators,
      )
    : undefined;

  const { auctionManagerKey } = await getAuctionKeys(vault);

  // V2s do not need to call this special endpoint.
  if (
    participationSafetyDepositDraft.masterEdition &&
    participationSafetyDepositDraft.masterEdition.info.key ==
      MetadataKey.MasterEditionV1
  ) {
    const me =
      participationSafetyDepositDraft.masterEdition as ParsedAccount<MasterEditionV1>;
    const printingTokenHoldingAccount = createTokenAccount(
      instructions,
      wallet.publicKey,
      accountRentExempt,
      me.info.printingMint,
      auctionManagerKey,
      signers,
    );
    await deprecatedValidateParticipation(
      auctionManager,
      participationSafetyDepositDraft.metadata.pubkey,
      participationSafetyDepositDraft.masterEdition?.pubkey,
      printingTokenHoldingAccount,
      wallet.publicKey,
      whitelistedCreator,
      store,
      await getSafetyDepositBoxAddress(
        vault,
        me.info.oneTimePrintingAuthorizationMint,
      ),
      tokenStore,
      vault,
      instructions,
    );
  }

  return { instructions, signers };
}

async function findValidWhitelistedCreator(
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  creators: Creator[],
): Promise<PublicKey> {
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];

    if (
      whitelistedCreatorsByCreator[creator.address.toBase58()]?.info.activated
    )
      return whitelistedCreatorsByCreator[creator.address.toBase58()].pubkey;
  }
  return await getWhitelistedCreator(creators[0]?.address);
}

async function validateBoxes(
  wallet: any,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: PublicKey,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  safetyDepositTokenStores: PublicKey[],
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  const store = programIds().store;
  if (!store) {
    throw new Error('Store not initialized');
  }
  let signers: Keypair[][] = [];
  let instructions: TransactionInstruction[][] = [];

  for (let i = 0; i < safetyDeposits.length; i++) {
    let tokenSigners: Keypair[] = [];
    let tokenInstructions: TransactionInstruction[] = [];

    let safetyDepositBox: PublicKey;

    const me = safetyDeposits[i].draft
      .masterEdition as ParsedAccount<MasterEditionV1>;
    if (
      safetyDeposits[i].config.winningConfigType ===
        WinningConfigType.PrintingV1 &&
      me &&
      me.info.printingMint
    ) {
      safetyDepositBox = await getSafetyDepositBox(
        vault,
        //@ts-ignore
        safetyDeposits[i].draft.masterEdition.info.printingMint,
      );
    } else {
      safetyDepositBox = await getSafetyDepositBox(
        vault,
        safetyDeposits[i].draft.metadata.info.mint,
      );
    }
    const edition: PublicKey = await getEdition(
      safetyDeposits[i].draft.metadata.info.mint,
    );

    const whitelistedCreator = safetyDeposits[i].draft.metadata.info.data
      .creators
      ? await findValidWhitelistedCreator(
          whitelistedCreatorsByCreator,
          //@ts-ignore
          safetyDeposits[i].draft.metadata.info.data.creators,
        )
      : undefined;

    await validateSafetyDepositBoxV2(
      vault,
      safetyDeposits[i].draft.metadata.pubkey,
      safetyDepositBox,
      safetyDepositTokenStores[i],
      safetyDeposits[i].config.winningConfigType ===
        WinningConfigType.PrintingV1
        ? me?.info.printingMint
        : safetyDeposits[i].draft.metadata.info.mint,
      wallet.publicKey,
      wallet.publicKey,
      wallet.publicKey,
      tokenInstructions,
      edition,
      whitelistedCreator,
      store,
      safetyDeposits[i].config,
    );

    signers.push(tokenSigners);
    instructions.push(tokenInstructions);
  }
  return { instructions, signers };
}

async function deprecatedBuildAndPopulateOneTimeAuthorizationAccount(
  connection: Connection,
  wallet: any,
  oneTimePrintingAuthorizationMint: PublicKey | undefined,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!oneTimePrintingAuthorizationMint)
    return { instructions: [], signers: [] };
  let signers: Keypair[] = [];
  let instructions: TransactionInstruction[] = [];
  const recipientKey: PublicKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        oneTimePrintingAuthorizationMint.toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  if (!(await connection.getAccountInfo(recipientKey))) {
    createAssociatedTokenAccountInstruction(
      instructions,
      recipientKey,
      wallet.publicKey,
      wallet.publicKey,
      oneTimePrintingAuthorizationMint,
    );
  }

  instructions.push(
    Token.createMintToInstruction(
      programIds().token,
      oneTimePrintingAuthorizationMint,
      recipientKey,
      wallet.publicKey,
      [],
      1,
    ),
  );

  return { instructions, signers };
}
