import {
  constants,
  IPartialCreateAuctionArgs,
  MetaplexOverlay,
  PriceFloor,
  PriceFloorType,
  StringPublicKey,
  toLamports,
  useConnection,
  useMint,
  WinnerLimit,
  WinnerLimitType,
  subscribeProgramChanges,
  METAPLEX_ID,
  processMetaplexAccounts,
  AUCTION_ID,
  processAuctions,
  VAULT_ID,
  processVaultData,
} from '@oyster/common';
import Bugsnag from '@bugsnag/browser';
import {
  AmountRange,
  WinningConfigType,
} from '@oyster/common/dist/lib/models/metaplex/index';
import { useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { Button, Col, Row, Space, Steps } from 'antd';
import BN from 'bn.js';
import React, { useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from '../../actions/createAuctionManager';
import { useAnalytics } from '../../components/Analytics';
import { useMeta } from '../../contexts';
import useWindowDimensions from '../../utils/layout';
import { QUOTE_MINT } from './../../constants';
import { CategoryStep } from './categoryStep';
import { Congrats } from './congrats';
import { CopiesStep } from './copiesStep';
import { EndingPhaseAuction } from './endingPhaseAuction';
import { InstantSaleStep } from './instantSaleStep';
import { NumberOfWinnersStep } from './numberOfWinnersStep';
import { ParticipationStep } from './participationStep';
import { PriceAuction } from './priceAuction';
import { ReviewStep } from './reviewStep';
import { TierTableStep } from './tierTableStep';
import { WaitingStep } from './waitingStep';

const { Step } = Steps;
const { ZERO } = constants;

export enum AuctionCategory {
  InstantSale,
  Limited,
  Single,
  Open,
  Tiered,
}

export enum InstantSaleType {
  Limited,
  Single,
  Open,
}

interface TierDummyEntry {
  safetyDepositBoxIndex: number;
  amount: number;
  winningConfigType: WinningConfigType;
}

export interface Tier {
  items: Partial<TierDummyEntry>[];
  winningSpots: number[];
}
export interface TieredAuctionState {
  items: SafetyDepositDraft[];
  tiers: Tier[];
  participationNFT?: SafetyDepositDraft;
}

export interface AuctionState {
  // Min price required for the item to sell
  reservationPrice: number;

  // listed NFTs
  items: SafetyDepositDraft[];
  participationNFT?: SafetyDepositDraft;
  participationFixedPrice?: number;
  // number of editions for this auction (only applicable to limited edition)
  editions?: number;

  // date time when auction should start UTC+0
  startDate?: Date;

  // suggested date time when auction should end UTC+0
  endDate?: Date;

  //////////////////
  category: AuctionCategory;

  price?: number;
  priceFloor?: number;
  priceTick?: number;

  startSaleTS?: number;
  startListTS?: number;
  endTS?: number;

  auctionDuration?: number;
  auctionDurationType?: 'days' | 'hours' | 'minutes';
  gapTime?: number;
  gapTimeType?: 'days' | 'hours' | 'minutes';
  tickSizeEndingPhase?: number;

  spots?: number;
  tiers?: Array<Tier>;

  winnersCount: number;

  instantSalePrice?: number;
  instantSaleType?: InstantSaleType;
}

export const AuctionCreateView = () => {
  const connection = useConnection();
  const wallet = useWallet();
  const { whitelistedCreatorsByCreator, storeIndexer, patchState } = useMeta();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const { track } = useAnalytics();
  const mint = useMint(QUOTE_MINT);
  const { width } = useWindowDimensions();
  const [percentComplete, setPercentComplete] = useState(0);
  const [rejection, setRejection] = useState<string>()
  const [step, setStep] = useState<number>(1);
  const [stepsVisible, setStepsVisible] = useState<boolean>(true);
  const [auctionObj, setAuctionObj] = useState<
    | {
        vault: StringPublicKey;
        auction: StringPublicKey;
        auctionManager: StringPublicKey;
      }
    | undefined
  >(undefined);
  const [attributes, setAttributes] = useState<AuctionState>({
    reservationPrice: 0,
    items: [],
    category: AuctionCategory.Open,
    auctionDurationType: 'minutes',
    gapTimeType: 'minutes',
    winnersCount: 1,
    startSaleTS: undefined,
    startListTS: undefined,
  });

  const [tieredAttributes, setTieredAttributes] = useState<TieredAuctionState>({
    items: [],
    tiers: [],
  });

  useEffect(() => {
    return subscribeProgramChanges(
      connection,
      patchState,
      {
        programId: METAPLEX_ID,
        processAccount: processMetaplexAccounts,
      },
      {
        programId: AUCTION_ID,
        processAccount: processAuctions,
      },
      {
        programId: VAULT_ID,
        processAccount: processVaultData
      }
    );
  }, [connection]);

  useEffect(() => {
    if (step_param) setStep(parseInt(step_param));
    else gotoNextStep(0);
  }, [step_param]);

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step;
    history.push(`/auction/create/${nextStep.toString()}`);
  };

  const createAuction = async () => {
    let winnerLimit: WinnerLimit;
    let auctionInfo: { vault: string, auction: string, auctionManager: string } | undefined;

    if (
      attributes.category === AuctionCategory.InstantSale &&
      attributes.instantSaleType === InstantSaleType.Open
    ) {
      const { items, instantSalePrice } = attributes;

      if (items.length > 0 && items[0].participationConfig) {
        items[0].participationConfig.fixedPrice = new BN(
          toLamports(instantSalePrice, mint) || 0,
        );
      }

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Unlimited,
        usize: ZERO,
      });
    } else if (attributes.category === AuctionCategory.InstantSale) {
      const { items, editions } = attributes;

      if (items.length > 0) {
        const item = items[0];

        if (!editions) {
          item.winningConfigType =
            item.metadata.info.updateAuthority ===
            (wallet?.publicKey || SystemProgram.programId).toBase58()
              ? WinningConfigType.FullRightsTransfer
              : WinningConfigType.TokenOnlyTransfer;
        }

        item.amountRanges = [
          new AmountRange({
            amount: new BN(1),
            length: new BN(editions || 1),
          }),
        ];
      }

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(editions || 1),
      });
    } else if (attributes.category === AuctionCategory.Open) {
      if (
        attributes.items.length > 0 &&
        attributes.items[0].participationConfig
      ) {
        attributes.items[0].participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0,
        );
      }
      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Unlimited,
        usize: ZERO,
      });
    } else if (
      attributes.category === AuctionCategory.Limited ||
      attributes.category === AuctionCategory.Single
    ) {
      if (attributes.items.length > 0) {
        const item = attributes.items[0];
        if (
          attributes.category == AuctionCategory.Single &&
          item.masterEdition
        ) {
          item.winningConfigType =
            item.metadata.info.updateAuthority ===
            (wallet?.publicKey || SystemProgram.programId).toBase58()
              ? WinningConfigType.FullRightsTransfer
              : WinningConfigType.TokenOnlyTransfer;
        }
        item.amountRanges = [
          new AmountRange({
            amount: new BN(1),
            length:
              attributes.category === AuctionCategory.Single
                ? new BN(1)
                : new BN(attributes.editions || 1),
          }),
        ];
      }
      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize:
          attributes.category === AuctionCategory.Single
            ? new BN(1)
            : new BN(attributes.editions || 1),
      });

      if (
        attributes.participationNFT &&
        attributes.participationNFT.participationConfig
      ) {
        attributes.participationNFT.participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0,
        );
      }
    } else {
      const tiers = tieredAttributes.tiers;
      tiers.forEach(
        c => (c.items = c.items.filter(i => i.winningConfigType !== undefined)),
      );
      const filteredTiers = tiers.filter(
        i => i.items.length > 0 && i.winningSpots.length > 0,
      );

      tieredAttributes.items.forEach((config, index) => {
        let ranges: AmountRange[] = [];
        filteredTiers.forEach(tier => {
          const tierRangeLookup: Record<number, AmountRange> = {};
          const tierRanges: AmountRange[] = [];
          const item = tier.items.find(i => i.safetyDepositBoxIndex === index);

          if (item) {
            if (item.winningConfigType === undefined)
              throw new Error('Missing item.winningConfigType');
            if (item.amount === undefined)
              throw new Error('Missing item.amount');

            config.winningConfigType = item.winningConfigType;
            const amount = item.amount;
            const sorted = tier.winningSpots.sort();
            sorted.forEach((spot, i) => {
              if (tierRangeLookup[spot - 1]) {
                tierRangeLookup[spot] = tierRangeLookup[spot - 1];
                tierRangeLookup[spot].length = tierRangeLookup[spot].length.add(
                  new BN(1),
                );
              } else {
                tierRangeLookup[spot] = new AmountRange({
                  amount: new BN(amount),
                  length: new BN(1),
                });
                // If the first spot with anything is winner spot 1, you want a section of 0 covering winning
                // spot 0.
                // If we have a gap, we want a gap area covered with zeroes.
                const zeroLength = i - 1 > 0 ? spot - sorted[i - 1] - 1 : spot;
                if (zeroLength > 0) {
                  tierRanges.push(
                    new AmountRange({
                      amount: new BN(0),
                      length: new BN(zeroLength),
                    }),
                  );
                }
                tierRanges.push(tierRangeLookup[spot]);
              }
            });
            // Ok now we have combined ranges from this tier range. Now we merge them into the ranges
            // at the top level.
            const oldRanges = ranges;
            ranges = [];
            let oldRangeCtr = 0,
              tierRangeCtr = 0;

            while (
              oldRangeCtr < oldRanges.length ||
              tierRangeCtr < tierRanges.length
            ) {
              let toAdd = new BN(0);
              if (
                tierRangeCtr < tierRanges.length &&
                tierRanges[tierRangeCtr].amount.gt(new BN(0))
              ) {
                toAdd = tierRanges[tierRangeCtr].amount;
              }

              if (oldRangeCtr == oldRanges.length) {
                ranges.push(
                  new AmountRange({
                    amount: toAdd,
                    length: tierRanges[tierRangeCtr].length,
                  }),
                );
                tierRangeCtr++;
              } else if (tierRangeCtr == tierRanges.length) {
                ranges.push(oldRanges[oldRangeCtr]);
                oldRangeCtr++;
              } else if (
                oldRanges[oldRangeCtr].length.gt(
                  tierRanges[tierRangeCtr].length,
                )
              ) {
                oldRanges[oldRangeCtr].length = oldRanges[
                  oldRangeCtr
                ].length.sub(tierRanges[tierRangeCtr].length);

                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: tierRanges[tierRangeCtr].length,
                  }),
                );

                tierRangeCtr += 1;
                // dont increment oldRangeCtr since i still have length to give
              } else if (
                tierRanges[tierRangeCtr].length.gt(
                  oldRanges[oldRangeCtr].length,
                )
              ) {
                tierRanges[tierRangeCtr].length = tierRanges[
                  tierRangeCtr
                ].length.sub(oldRanges[oldRangeCtr].length);

                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: oldRanges[oldRangeCtr].length,
                  }),
                );

                oldRangeCtr += 1;
                // dont increment tierRangeCtr since they still have length to give
              } else if (
                tierRanges[tierRangeCtr].length.eq(
                  oldRanges[oldRangeCtr].length,
                )
              ) {
                ranges.push(
                  new AmountRange({
                    amount: oldRanges[oldRangeCtr].amount.add(toAdd),
                    length: oldRanges[oldRangeCtr].length,
                  }),
                );
                // Move them both in this degen case
                oldRangeCtr++;
                tierRangeCtr++;
              }
            }
          }
        });
        console.log('Ranges');
        config.amountRanges = ranges;
      });

      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(attributes.winnersCount),
      });
      if (
        attributes.participationNFT &&
        attributes.participationNFT.participationConfig
      ) {
        attributes.participationNFT.participationConfig.fixedPrice = new BN(
          toLamports(attributes.participationFixedPrice, mint) || 0,
        );
      }
      console.log('Tiered settings', tieredAttributes.items);
    }

    const isInstantSale =
      attributes.instantSalePrice &&
      attributes.priceFloor === attributes.instantSalePrice;

    const auctionSettings: IPartialCreateAuctionArgs = {
      winners: winnerLimit,
      endAuctionAt: isInstantSale
        ? null
        : new BN(
            (attributes.auctionDuration || 0) *
              (attributes.auctionDurationType == 'days'
                ? 60 * 60 * 24 // 1 day in seconds
                : attributes.auctionDurationType == 'hours'
                ? 60 * 60 // 1 hour in seconds
                : 60), // 1 minute in seconds
          ), // endAuctionAt is actually auction duration, poorly named, in seconds
      auctionGap: isInstantSale
        ? null
        : new BN(
            (attributes.gapTime || 0) *
              (attributes.gapTimeType == 'days'
                ? 60 * 60 * 24 // 1 day in seconds
                : attributes.gapTimeType == 'hours'
                ? 60 * 60 // 1 hour in seconds
                : 60), // 1 minute in seconds
          ),
      priceFloor: new PriceFloor({
        type: attributes.priceFloor
          ? PriceFloorType.Minimum
          : PriceFloorType.None,
        minPrice: new BN((attributes.priceFloor || 0) * LAMPORTS_PER_SOL),
      }),
      tokenMint: QUOTE_MINT.toBase58(),
      gapTickSizePercentage: attributes.tickSizeEndingPhase || null,
      tickSize: attributes.priceTick
        ? new BN(attributes.priceTick * LAMPORTS_PER_SOL)
        : null,
      instantSalePrice: attributes.instantSalePrice
        ? new BN((attributes.instantSalePrice || 0) * LAMPORTS_PER_SOL)
        : null,
      name: null,
    };

    const isOpenEdition =
      attributes.category === AuctionCategory.Open ||
      attributes.instantSaleType === InstantSaleType.Open;
    const safetyDepositDrafts = isOpenEdition
      ? []
      : attributes.category !== AuctionCategory.Tiered
      ? attributes.items
      : tieredAttributes.items;
    const participationSafetyDepositDraft = isOpenEdition
      ? attributes.items[0]
      : attributes.participationNFT;
    
    try {
      auctionInfo = await createAuctionManager(
        connection,
        wallet,
        setPercentComplete,
        setRejection,
        whitelistedCreatorsByCreator,
        auctionSettings,
        safetyDepositDrafts,
        participationSafetyDepositDraft,
        QUOTE_MINT.toBase58(),
        storeIndexer,
      );
    } catch (e: any) {
      setRejection(e.message);
      Bugsnag.notify(e);
      return;  
    }

    try {

      track('new_listing', {
        category: 'creation',
        label: isInstantSale ? 'instant sale' : 'auction',
        // sol_value: isInstantSale
        //   ? auctionSettings.instantSalePrice?.toNumber() // this price is like 100x the real sol price. Is it in lamports?
        //   : auctionSettings.priceFloor.minPrice?.toNumber(),
      });
    } catch (error) {
      console.error('failed tracking new_listing');
    }

    setAuctionObj(auctionInfo);
    gotoNextStep();
  };

  const categoryStep = (
    <CategoryStep
      confirm={(category: AuctionCategory) => {
        setAttributes({
          ...attributes,
          category,
        });
        gotoNextStep();
      }}
    />
  );

  const instantSaleStep = (
    <InstantSaleStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const copiesStep = (
    <CopiesStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const winnersStep = (
    <NumberOfWinnersStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const priceAuction = (
    <PriceAuction
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const endingStep = (
    <EndingPhaseAuction
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const participationStep = (
    <ParticipationStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const tierTableStep = (
    <TierTableStep
      attributes={tieredAttributes}
      setAttributes={setTieredAttributes}
      maxWinners={attributes.winnersCount}
      confirm={() => gotoNextStep()}
    />
  );

  const reviewStep = (
    <ReviewStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => {
        setStepsVisible(false);
        gotoNextStep();
      }}
      connection={connection}
    />
  );

  const waitStep = (
    <WaitingStep
      percent={percentComplete}
      rejection={rejection}
      createAuction={createAuction}
    />
  );

  const congratsStep = (
    <MetaplexOverlay visible={true}>
      <Congrats auction={auctionObj} />
    </MetaplexOverlay>
  );

  const stepsByCategory = {
    [AuctionCategory.InstantSale]: [
      ['Category', categoryStep],
      ['Instant Sale', instantSaleStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Limited]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Single]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Open]: [
      ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceAuction],
      ['Ending Phase', endingStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Tiered]: [
      ['Category', categoryStep],
      ['Winners', winnersStep],
      ['Tiers', tierTableStep],
      ['Price', priceAuction],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
  };

  return (
    <>
      <Row>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
            >
              {stepsByCategory[attributes.category]
                .filter(_ => !!_[0])
                .map((step, idx) => (
                  <Step title={step[0]} key={idx} />
                ))}
            </Steps>
          </Col>
        )}
        <Col span={24} {...(stepsVisible ? { md: 20 } : { md: 24 })}>
          <Space
            className="metaplex-fullwidth metaplex-space-align-stretch"
            direction="vertical"
          >
            {stepsByCategory[attributes.category][step][1]}
            {0 < step && stepsVisible && (
              <Row justify="center">
                <Button onClick={() => gotoNextStep(step - 1)}>Back</Button>
              </Row>
            )}
          </Space>
        </Col>
      </Row>
    </>
  );
};
