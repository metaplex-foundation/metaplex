import {
  Keypair,
  Connection,
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
  StringPublicKey,
  toPublicKey,
  WalletSigner,
} from '@oyster/common';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
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
  ParticipationStateV2,
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
  holding: StringPublicKey;
  printingMintHolding?: StringPublicKey;
  winningConfigType: WinningConfigType;
  amountRanges: AmountRange[];
  participationConfig?: ParticipationConfigV2;
}

// This is a super command that executes many transactions to create a Vault, Auction, and AuctionManager starting
// from some AuctionManagerSettings.
export async function createAuctionManager(
  connection: Connection,
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  auctionSettings: IPartialCreateAuctionArgs,
  safetyDepositDrafts: SafetyDepositDraft[],
  participationSafetyDepositDraft: SafetyDepositDraft | undefined,
  paymentMint: StringPublicKey,
): Promise<{
  vault: StringPublicKey;
  auction: StringPublicKey;
  auctionManager: StringPublicKey;
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

  const safetyDepositConfigsWithPotentiallyUnsetTokens =
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

  const lookup: byType = {
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
            c.draft.metadata.pubkey !==
              participationSafetyDepositDraft.metadata.pubkey) ||
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

  const signers: Keypair[][] = [
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
  let lastInstructionsLength: number | null = null;
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
  wallet: WalletSigner,
  safetyDeposits: SafetyDepositDraft[],
  participationSafetyDepositDraft: SafetyDepositDraft | undefined,
): Promise<SafetyDepositInstructionTemplate[]> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const safetyDepositTemplates: SafetyDepositInstructionTemplate[] = [];
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
          auctionManager: SystemProgram.programId.toBase58(),
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
        auctionManager: SystemProgram.programId.toBase58(),
        order: new BN(safetyDeposits.length),
        amountRanges: participationSafetyDepositDraft.amountRanges,
        amountType: maxAmount?.gte(new BN(255))
          ? TupleNumericType.U32
          : TupleNumericType.U8,
        lengthType: maxLength?.gte(new BN(255))
          ? TupleNumericType.U32
          : TupleNumericType.U8,
        winningConfigType: WinningConfigType.Participation,
        participationConfig:
          participationSafetyDepositDraft.participationConfig || null,
        participationState: new ParticipationStateV2({
          collectedToAcceptPayment: new BN(0),
        }),
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
                toPublicKey(
                  me?.info.oneTimePrintingAuthorizationMint,
                ).toBuffer(),
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
  console.log('Temps', safetyDepositTemplates);
  return safetyDepositTemplates;
}

async function setupAuctionManagerInstructions(
  wallet: WalletSigner,
  vault: StringPublicKey,
  paymentMint: StringPublicKey,
  accountRentExempt: number,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  auctionSettings: IPartialCreateAuctionArgs,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
  auctionManager: StringPublicKey;
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  const { auctionManagerKey } = await getAuctionKeys(vault);

  const acceptPayment = createTokenAccount(
    instructions,
    wallet.publicKey,
    accountRentExempt,
    toPublicKey(paymentMint),
    toPublicKey(auctionManagerKey),
    signers,
  ).toBase58();

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
    wallet.publicKey.toBase58(),
    wallet.publicKey.toBase58(),
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
  wallet: WalletSigner,
  vault: StringPublicKey,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];

  await startAuction(vault, wallet.publicKey.toBase58(), instructions);

  return { instructions, signers };
}

async function deprecatedValidateParticipationHelper(
  wallet: WalletSigner,
  auctionManager: StringPublicKey,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: StringPublicKey,
  tokenStore: StringPublicKey,
  participationSafetyDepositDraft: SafetyDepositDraft,
  accountRentExempt: number,
): Promise<{ instructions: TransactionInstruction[]; signers: Keypair[] }> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }

  const instructions: TransactionInstruction[] = [];
  const signers: Keypair[] = [];
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
      toPublicKey(me.info.printingMint),
      toPublicKey(auctionManagerKey),
      signers,
    ).toBase58();
    await deprecatedValidateParticipation(
      auctionManager,
      participationSafetyDepositDraft.metadata.pubkey,
      participationSafetyDepositDraft.masterEdition?.pubkey,
      printingTokenHoldingAccount,
      wallet.publicKey.toBase58(),
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
): Promise<StringPublicKey> {
  for (let i = 0; i < creators.length; i++) {
    const creator = creators[i];

    if (whitelistedCreatorsByCreator[creator.address]?.info.activated)
      return whitelistedCreatorsByCreator[creator.address].pubkey;
  }
  return await getWhitelistedCreator(creators[0]?.address);
}

async function validateBoxes(
  wallet: WalletSigner,
  whitelistedCreatorsByCreator: Record<
    string,
    ParsedAccount<WhitelistedCreator>
  >,
  vault: StringPublicKey,
  safetyDeposits: SafetyDepositInstructionTemplate[],
  safetyDepositTokenStores: StringPublicKey[],
): Promise<{
  instructions: TransactionInstruction[][];
  signers: Keypair[][];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const store = programIds().store?.toBase58();
  if (!store) {
    throw new Error('Store not initialized');
  }
  const signers: Keypair[][] = [];
  const instructions: TransactionInstruction[][] = [];

  for (let i = 0; i < safetyDeposits.length; i++) {
    const tokenSigners: Keypair[] = [];
    const tokenInstructions: TransactionInstruction[] = [];

    let safetyDepositBox: StringPublicKey;

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
    const edition: StringPublicKey = await getEdition(
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
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
      wallet.publicKey.toBase58(),
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
  wallet: WalletSigner,
  oneTimePrintingAuthorizationMint: StringPublicKey | undefined,
): Promise<{
  instructions: TransactionInstruction[];
  signers: Keypair[];
}> {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  if (!oneTimePrintingAuthorizationMint)
    return { instructions: [], signers: [] };
  const signers: Keypair[] = [];
  const instructions: TransactionInstruction[] = [];
  const recipientKey: StringPublicKey = (
    await findProgramAddress(
      [
        wallet.publicKey.toBuffer(),
        programIds().token.toBuffer(),
        toPublicKey(oneTimePrintingAuthorizationMint).toBuffer(),
      ],
      programIds().associatedToken,
    )
  )[0];

  if (!(await connection.getAccountInfo(toPublicKey(recipientKey)))) {
    createAssociatedTokenAccountInstruction(
      instructions,
      toPublicKey(recipientKey),
      wallet.publicKey,
      wallet.publicKey,
      toPublicKey(oneTimePrintingAuthorizationMint),
    );
  }

  instructions.push(
    Token.createMintToInstruction(
      programIds().token,
      toPublicKey(oneTimePrintingAuthorizationMint),
      toPublicKey(recipientKey),
      wallet.publicKey,
      [],
      1,
    ),
  );

  return { instructions, signers };
}
