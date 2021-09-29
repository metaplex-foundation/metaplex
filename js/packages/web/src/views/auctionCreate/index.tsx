import React, { useEffect, useState } from 'react';
import {
  Divider,
  Steps,
  Row,
  Button,
  Col,
  Input,
  Statistic,
  Progress,
  Spin,
  Radio,
  Card,
  Select,
  Checkbox,
} from 'antd';
import { ArtCard } from './../../components/ArtCard';
import { QUOTE_MINT } from './../../constants';
import { Confetti } from './../../components/Confetti';
import { ArtSelector } from './artSelector';
import {
  MAX_METADATA_LEN,
  useConnection,
  WinnerLimit,
  WinnerLimitType,
  toLamports,
  useMint,
  Creator,
  PriceFloor,
  PriceFloorType,
  IPartialCreateAuctionArgs,
  MetadataKey,
  StringPublicKey,
} from '@oyster/common';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import { capitalize } from 'lodash';
import {
  WinningConfigType,
  AmountRange,
} from '@oyster/common/dist/lib/models/metaplex/index';
import moment from 'moment';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from '../../actions/createAuctionManager';
import BN from 'bn.js';
import { constants } from '@oyster/common';
import { DateTimePicker } from '../../components/DateTimePicker';
import { AmountLabel } from '../../components/AmountLabel';
import { useMeta } from '../../contexts';
import useWindowDimensions from '../../utils/layout';
import { PlusCircleOutlined } from '@ant-design/icons';
import { SystemProgram } from '@solana/web3.js';

const { Option } = Select;
const { Step } = Steps;
const { ZERO } = constants;

export enum AuctionCategory {
  InstantSale,
  Limited,
  Single,
  Open,
  Tiered,
}

interface TierDummyEntry {
  safetyDepositBoxIndex: number;
  amount: number;
  winningConfigType: WinningConfigType;
}

interface Tier {
  items: (TierDummyEntry | {})[];
  winningSpots: number[];
}
interface TieredAuctionState {
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
}

export const AuctionCreateView = () => {
  const connection = useConnection();
  const wallet = useWallet();
  const { whitelistedCreatorsByCreator, auctionCaches, storeIndexer } =
    useMeta();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const mint = useMint(QUOTE_MINT);
  const { width } = useWindowDimensions();

  const [step, setStep] = useState<number>(0);
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
    if (step_param) setStep(parseInt(step_param));
    else gotoNextStep(0);
  }, [step_param]);

  const gotoNextStep = (_step?: number) => {
    const nextStep = _step === undefined ? step + 1 : _step;
    history.push(`/auction/create/${nextStep.toString()}`);
  };

  const createAuction = async () => {
    let winnerLimit: WinnerLimit;
    if (attributes.category === AuctionCategory.InstantSale) {
      if (attributes.items.length > 0) {
        const item = attributes.items[0];
        if (!attributes.editions) {
          item.winningConfigType =
            item.metadata.info.updateAuthority ===
            (wallet?.publicKey || SystemProgram.programId).toBase58()
              ? WinningConfigType.FullRightsTransfer
              : WinningConfigType.TokenOnlyTransfer;
        }
        item.amountRanges = [
          new AmountRange({
            amount: new BN(1),
            length: new BN(attributes.editions || 1),
          }),
        ];
      }
      winnerLimit = new WinnerLimit({
        type: WinnerLimitType.Capped,
        usize: new BN(attributes.editions || 1),
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
        c =>
          (c.items = c.items.filter(
            i => (i as TierDummyEntry).winningConfigType !== undefined,
          )),
      );
      let filteredTiers = tiers.filter(
        i => i.items.length > 0 && i.winningSpots.length > 0,
      );

      tieredAttributes.items.forEach((config, index) => {
        let ranges: AmountRange[] = [];
        filteredTiers.forEach(tier => {
          const tierRangeLookup: Record<number, AmountRange> = {};
          const tierRanges: AmountRange[] = [];
          const item = tier.items.find(
            i => (i as TierDummyEntry).safetyDepositBoxIndex == index,
          );

          if (item) {
            config.winningConfigType = (
              item as TierDummyEntry
            ).winningConfigType;
            const sorted = tier.winningSpots.sort();
            sorted.forEach((spot, i) => {
              if (tierRangeLookup[spot - 1]) {
                tierRangeLookup[spot] = tierRangeLookup[spot - 1];
                tierRangeLookup[spot].length = tierRangeLookup[spot].length.add(
                  new BN(1),
                );
              } else {
                tierRangeLookup[spot] = new AmountRange({
                  amount: new BN((item as TierDummyEntry).amount),
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
            let oldRanges = ranges;
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

    const _auctionObj = await createAuctionManager(
      connection,
      wallet,
      whitelistedCreatorsByCreator,
      auctionSettings,
      attributes.category === AuctionCategory.Open
        ? []
        : attributes.category !== AuctionCategory.Tiered
        ? attributes.items
        : tieredAttributes.items,
      attributes.category === AuctionCategory.Open
        ? attributes.items[0]
        : attributes.participationNFT,
      QUOTE_MINT.toBase58(),
      auctionCaches,
      storeIndexer,
    );
    setAuctionObj(_auctionObj);
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

  const initialStep = (
    <InitialPhaseStep
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
    <WaitingStep createAuction={createAuction} confirm={() => gotoNextStep()} />
  );

  const congratsStep = <Congrats auction={auctionObj} />;

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
      ['Initial Phase', initialStep],
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
      ['Initial Phase', initialStep],
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
      ['Initial Phase', initialStep],
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
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
  };

  return (
    <>
      <Row style={{ paddingTop: 50 }}>
        {stepsVisible && (
          <Col span={24} md={4}>
            <Steps
              progressDot
              direction={width < 768 ? 'horizontal' : 'vertical'}
              current={step}
              style={{
                width: 'fit-content',
                margin: '0 auto 30px auto',
                overflowX: 'auto',
                maxWidth: '100%',
              }}
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
          {stepsByCategory[attributes.category][step][1]}
          {0 < step && stepsVisible && (
            <div style={{ margin: 'auto', width: 'fit-content' }}>
              <Button onClick={() => gotoNextStep(step - 1)}>Back</Button>
            </div>
          )}
        </Col>
      </Row>
    </>
  );
};

const CategoryStep = (props: {
  confirm: (category: AuctionCategory) => void;
}) => {
  const { width } = useWindowDimensions();
  return (
    <>
      <Row className="call-to-action">
        <h2>List an item</h2>
        <p>
          First time listing on Metaplex? <a>Read our sellers' guide.</a>
        </p>
      </Row>
      <Row justify={width < 768 ? 'center' : 'start'}>
        <Col>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(AuctionCategory.InstantSale)}
            >
              <div>
                <div>Instant Sale</div>
                <div className="type-btn-description">
                  At a fixed price, sell a single Master NFT or copies of it
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(AuctionCategory.Limited)}
            >
              <div>
                <div>Limited Edition</div>
                <div className="type-btn-description">
                  Sell a limited copy or copies of a single Master NFT
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(AuctionCategory.Open)}
            >
              <div>
                <div>Open Edition</div>
                <div className="type-btn-description">
                  Sell unlimited copies of a single Master NFT
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(AuctionCategory.Tiered)}
            >
              <div>
                <div>Tiered Auction</div>
                <div className="type-btn-description">
                  Participants get unique rewards based on their leaderboard
                  rank
                </div>
              </div>
            </Button>
          </Row>
          <Row>
            <Button
              className="type-btn"
              size="large"
              onClick={() => props.confirm(AuctionCategory.Single)}
            >
              <div>
                <div>Sell an Existing Item</div>
                <div className="type-btn-description">
                  Sell an existing item in your NFT collection, including Master
                  NFTs
                </div>
              </div>
            </Button>
          </Row>
        </Col>
      </Row>
    </>
  );
};

const InstantSaleStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const [copiesChecked, setCopiesChecked] = useState(false);
  const copiesEnabled = React.useMemo(
    () => !!props.attributes?.items?.[0]?.masterEdition?.info?.maxSupply,
    [props.attributes?.items?.[0]],
  );

  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 0 }}>
        <h2>Select which item to sell:</h2>
      </Row>

      <Row className="content-action">
        <Col xl={24}>
          <ArtSelector
            filter={artistFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items });
            }}
            allowMultiple={false}
          >
            Select NFT
          </ArtSelector>

          <label className="action-field">
            <Checkbox
              defaultChecked={false}
              checked={copiesChecked}
              disabled={!copiesEnabled}
              onChange={e => setCopiesChecked(e.target.checked)}
            >
              <span className="field-title">
                Create copies of a Master Edition NFT?
              </span>
            </Checkbox>
            {copiesChecked && copiesEnabled && (
              <>
                <span className="field-info">
                  Each copy will be given unique edition number e.g. 1 of 30
                </span>
                <Input
                  autoFocus
                  className="input"
                  placeholder="Enter number of copies sold"
                  allowClear
                  onChange={info =>
                    props.setAttributes({
                      ...props.attributes,
                      editions: parseInt(info.target.value),
                    })
                  }
                />
              </>
            )}
          </label>

          <label className="action-field">
            <span className="field-title">Price</span>
            <span className="field-info">
              This is the instant sale price for your item.
            </span>
            <Input
              type="number"
              min={0}
              autoFocus
              className="input"
              placeholder="Price"
              prefix="◎"
              suffix="SOL"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  priceFloor: parseFloat(info.target.value),
                  instantSalePrice: parseFloat(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.confirm();
          }}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};

const CopiesStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);
  let filter: (i: SafetyDepositDraft) => boolean = (i: SafetyDepositDraft) =>
    true;
  if (props.attributes.category === AuctionCategory.Limited) {
    filter = (i: SafetyDepositDraft) =>
      !!i.masterEdition && !!i.masterEdition.info.maxSupply;
  } else if (props.attributes.category === AuctionCategory.Open) {
    filter = (i: SafetyDepositDraft) =>
      !!(
        i.masterEdition &&
        (i.masterEdition.info.maxSupply === undefined ||
          i.masterEdition.info.maxSupply === null)
      );
  }

  let overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 0 }}>
        <h2>Select which item to sell</h2>
        <p style={{ fontSize: '1.2rem' }}>
          Select the item(s) that you want to list.
        </p>
      </Row>
      <Row className="content-action">
        <Col xl={24}>
          <ArtSelector
            filter={overallFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items });
            }}
            allowMultiple={false}
          >
            Select NFT
          </ArtSelector>
          {props.attributes.category === AuctionCategory.Limited && (
            <label className="action-field">
              <span className="field-title">
                How many copies do you want to create?
              </span>
              <span className="field-info">
                Each copy will be given unique edition number e.g. 1 of 30
              </span>
              <Input
                autoFocus
                className="input"
                placeholder="Enter number of copies sold"
                allowClear
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    editions: parseInt(info.target.value),
                  })
                }
              />
            </label>
          )}
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.confirm();
          }}
          className="action-btn"
        >
          Continue to Terms
        </Button>
      </Row>
    </>
  );
};

const NumberOfWinnersStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Tiered Auction</h2>
        <p>Create a Tiered Auction</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          <label className="action-field">
            <span className="field-title">
              How many participants can win the auction?
            </span>
            <span className="field-info">
              This is the number of spots in the leaderboard.
            </span>
            <Input
              type="number"
              autoFocus
              className="input"
              placeholder="Number of spots in the leaderboard"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  winnersCount: parseInt(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};

const PriceAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Price</h2>
        <p>Set the price for your auction.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          {props.attributes.category === AuctionCategory.Open && (
            <label className="action-field">
              <span className="field-title">Price</span>
              <span className="field-info">
                This is the fixed price that everybody will pay for your
                Participation NFT.
              </span>
              <Input
                type="number"
                min={0}
                autoFocus
                className="input"
                placeholder="Fixed Price"
                prefix="◎"
                suffix="SOL"
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    // Do both, since we know this is the only item being sold.
                    participationFixedPrice: parseFloat(info.target.value),
                    priceFloor: parseFloat(info.target.value),
                  })
                }
              />
            </label>
          )}
          {props.attributes.category !== AuctionCategory.Open && (
            <label className="action-field">
              <span className="field-title">Price Floor</span>
              <span className="field-info">
                This is the starting bid price for your auction.
              </span>
              <Input
                type="number"
                min={0}
                autoFocus
                className="input"
                placeholder="Price"
                prefix="◎"
                suffix="SOL"
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    priceFloor: parseFloat(info.target.value),
                  })
                }
              />
            </label>
          )}
          <label className="action-field">
            <span className="field-title">Tick Size</span>
            <span className="field-info">
              All bids must fall within this price increment.
            </span>
            <Input
              type="number"
              min={0}
              className="input"
              placeholder="Tick size in SOL"
              prefix="◎"
              suffix="SOL"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  priceTick: parseFloat(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};

const InitialPhaseStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const [startNow, setStartNow] = useState<boolean>(true);
  const [listNow, setListNow] = useState<boolean>(true);

  const [saleMoment, setSaleMoment] = useState<moment.Moment | undefined>(
    props.attributes.startSaleTS
      ? moment.unix(props.attributes.startSaleTS)
      : undefined,
  );
  const [listMoment, setListMoment] = useState<moment.Moment | undefined>(
    props.attributes.startListTS
      ? moment.unix(props.attributes.startListTS)
      : undefined,
  );

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startSaleTS: saleMoment && saleMoment.unix(),
    });
  }, [saleMoment]);

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      startListTS: listMoment && listMoment.unix(),
    });
  }, [listMoment]);

  useEffect(() => {
    if (startNow) {
      setSaleMoment(undefined);
      setListNow(true);
    } else {
      setSaleMoment(moment());
    }
  }, [startNow]);

  useEffect(() => {
    if (listNow) setListMoment(undefined);
    else setListMoment(moment());
  }, [listNow]);

  return (
    <>
      <Row className="call-to-action">
        <h2>Initial Phase</h2>
        <p>Set the terms for your auction.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          <label className="action-field">
            <span className="field-title">
              When do you want the auction to begin?
            </span>
            <Radio.Group
              defaultValue="now"
              onChange={info => setStartNow(info.target.value === 'now')}
            >
              <Radio className="radio-field" value="now">
                Immediately
              </Radio>
              <div className="radio-subtitle">
                Participants can buy the NFT as soon as you finish setting up
                the auction.
              </div>
              <Radio className="radio-field" value="later">
                At a specified date
              </Radio>
              <div className="radio-subtitle">
                Participants can start buying the NFT at a specified date.
              </div>
            </Radio.Group>
          </label>

          {!startNow && (
            <>
              <label className="action-field">
                <span className="field-title">Auction Start Date</span>
                {saleMoment && (
                  <DateTimePicker
                    momentObj={saleMoment}
                    setMomentObj={setSaleMoment}
                    datePickerProps={{
                      disabledDate: (current: moment.Moment) =>
                        current && current < moment().endOf('day'),
                    }}
                  />
                )}
              </label>

              <label className="action-field">
                <span className="field-title">
                  When do you want the listing to go live?
                </span>
                <Radio.Group
                  defaultValue="now"
                  onChange={info => setListNow(info.target.value === 'now')}
                >
                  <Radio
                    className="radio-field"
                    value="now"
                    defaultChecked={true}
                  >
                    Immediately
                  </Radio>
                  <div className="radio-subtitle">
                    Participants will be able to view the listing with a
                    countdown to the start date as soon as you finish setting up
                    the sale.
                  </div>
                  <Radio className="radio-field" value="later">
                    At a specified date
                  </Radio>
                  <div className="radio-subtitle">
                    Participants will be able to view the listing with a
                    countdown to the start date at the specified date.
                  </div>
                </Radio.Group>
              </label>

              {!listNow && (
                <label className="action-field">
                  <span className="field-title">Preview Start Date</span>
                  {listMoment && (
                    <DateTimePicker
                      momentObj={listMoment}
                      setMomentObj={setListMoment}
                      datePickerProps={{
                        disabledDate: (current: moment.Moment) =>
                          current &&
                          saleMoment &&
                          (current < moment().endOf('day') ||
                            current > saleMoment),
                      }}
                    />
                  )}
                </label>
              )}
            </>
          )}
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};

const EndingPhaseAuction = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Ending Phase</h2>
        <p>Set the terms for your auction.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          <div className="action-field">
            <span className="field-title">Auction Duration</span>
            <span className="field-info">
              This is how long the auction will last for.
            </span>
            <Input
              addonAfter={
                <Select
                  defaultValue={props.attributes.auctionDurationType}
                  onChange={value =>
                    props.setAttributes({
                      ...props.attributes,
                      auctionDurationType: value,
                    })
                  }
                >
                  <Option value="minutes">Minutes</Option>
                  <Option value="hours">Hours</Option>
                  <Option value="days">Days</Option>
                </Select>
              }
              autoFocus
              type="number"
              className="input"
              placeholder="Set the auction duration"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  auctionDuration: parseInt(info.target.value),
                })
              }
            />
          </div>

          <div className="action-field">
            <span className="field-title">Gap Time</span>
            <span className="field-info">
              The final phase of the auction will begin when there is this much
              time left on the countdown. Any bids placed during the final phase
              will extend the end time by this same duration.
            </span>
            <Input
              addonAfter={
                <Select
                  defaultValue={props.attributes.gapTimeType}
                  onChange={value =>
                    props.setAttributes({
                      ...props.attributes,
                      gapTimeType: value,
                    })
                  }
                >
                  <Option value="minutes">Minutes</Option>
                  <Option value="hours">Hours</Option>
                  <Option value="days">Days</Option>
                </Select>
              }
              type="number"
              className="input"
              placeholder="Set the gap time"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  gapTime: parseInt(info.target.value),
                })
              }
            />
          </div>

          <label className="action-field">
            <span className="field-title">Tick Size for Ending Phase</span>
            <span className="field-info">
              In order for winners to move up in the auction, they must place a
              bid that’s at least this percentage higher than the next highest
              bid.
            </span>
            <Input
              type="number"
              className="input"
              placeholder="Percentage"
              suffix="%"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  tickSizeEndingPhase: parseInt(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue
        </Button>
      </Row>
    </>
  );
};

const TierTableStep = (props: {
  attributes: TieredAuctionState;
  setAttributes: (attr: TieredAuctionState) => void;
  maxWinners: number;
  confirm: () => void;
}) => {
  const newImmutableTiers = (tiers: Tier[]) => {
    return tiers.map(wc => ({
      items: [...wc.items.map(it => ({ ...it }))],
      winningSpots: [...wc.winningSpots],
    }));
  };
  let artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified);
  const options: { label: string; value: number }[] = [];
  for (let i = 0; i < props.maxWinners; i++) {
    options.push({ label: `Winner ${i + 1}`, value: i });
  }
  return (
    <>
      <Row className="call-to-action">
        <h2>Add Winning Tiers and Their Prizes</h2>
        <p>
          Each row represents a tier. You can choose which winning spots get
          which tiers.
        </p>
      </Row>
      {props.attributes.tiers.map((wcg, configIndex) => (
        <Row className="content-action" key={configIndex}>
          <Col xl={24}>
            <h3>Tier #{configIndex + 1} Basket</h3>
          </Col>

          <Checkbox.Group
            options={options}
            onChange={value => {
              const newTiers = newImmutableTiers(props.attributes.tiers);
              const myNewTier = newTiers[configIndex];
              myNewTier.winningSpots = value.map(i => i.valueOf() as number);

              props.setAttributes({
                ...props.attributes,
                tiers: newTiers,
              });
            }}
          />

          {wcg.items.map((i, itemIndex) => (
            <Col className="section" xl={8} key={itemIndex}>
              <Card>
                <ArtSelector
                  filter={artistFilter}
                  selected={
                    (i as TierDummyEntry).safetyDepositBoxIndex !== undefined
                      ? [
                          props.attributes.items[
                            (i as TierDummyEntry).safetyDepositBoxIndex
                          ],
                        ]
                      : []
                  }
                  setSelected={items => {
                    const newItems = [
                      ...props.attributes.items.map(it => ({ ...it })),
                    ];

                    const newTiers = newImmutableTiers(props.attributes.tiers);
                    if (items[0]) {
                      const existing = props.attributes.items.find(
                        it => it.metadata.pubkey === items[0].metadata.pubkey,
                      );
                      if (!existing) newItems.push(items[0]);
                      const index = newItems.findIndex(
                        it => it.metadata.pubkey === items[0].metadata.pubkey,
                      );

                      const myNewTier = newTiers[configIndex].items[itemIndex];
                      myNewTier.safetyDepositBoxIndex = index;
                      if (
                        items[0].masterEdition &&
                        items[0].masterEdition.info.key ==
                          MetadataKey.MasterEditionV1
                      ) {
                        myNewTier.winningConfigType =
                          WinningConfigType.PrintingV1;
                      } else if (
                        items[0].masterEdition &&
                        items[0].masterEdition.info.key ==
                          MetadataKey.MasterEditionV2
                      ) {
                        myNewTier.winningConfigType =
                          WinningConfigType.PrintingV2;
                      } else {
                        myNewTier.winningConfigType =
                          WinningConfigType.TokenOnlyTransfer;
                      }
                      myNewTier.amount = 1;
                    } else if (
                      (i as TierDummyEntry).safetyDepositBoxIndex !== undefined
                    ) {
                      const myNewTier = newTiers[configIndex];
                      myNewTier.items.splice(itemIndex, 1);
                      if (myNewTier.items.length === 0)
                        newTiers.splice(configIndex, 1);
                      const othersWithSameItem = newTiers.find(c =>
                        c.items.find(
                          it =>
                            it.safetyDepositBoxIndex ===
                            (i as TierDummyEntry).safetyDepositBoxIndex,
                        ),
                      );

                      if (!othersWithSameItem) {
                        for (
                          let j =
                            (i as TierDummyEntry).safetyDepositBoxIndex + 1;
                          j < props.attributes.items.length;
                          j++
                        ) {
                          newTiers.forEach(c =>
                            c.items.forEach(it => {
                              if (it.safetyDepositBoxIndex === j)
                                it.safetyDepositBoxIndex--;
                            }),
                          );
                        }
                        newItems.splice(
                          (i as TierDummyEntry).safetyDepositBoxIndex,
                          1,
                        );
                      }
                    }

                    props.setAttributes({
                      ...props.attributes,
                      items: newItems,
                      tiers: newTiers,
                    });
                  }}
                  allowMultiple={false}
                >
                  Select item
                </ArtSelector>

                {(i as TierDummyEntry).winningConfigType !== undefined && (
                  <>
                    <Select
                      defaultValue={(i as TierDummyEntry).winningConfigType}
                      style={{ width: 120 }}
                      onChange={value => {
                        const newTiers = newImmutableTiers(
                          props.attributes.tiers,
                        );

                        const myNewTier =
                          newTiers[configIndex].items[itemIndex];

                        // Legacy hack...
                        if (
                          value == WinningConfigType.PrintingV2 &&
                          myNewTier.safetyDepositBoxIndex &&
                          props.attributes.items[
                            myNewTier.safetyDepositBoxIndex
                          ].masterEdition?.info.key ==
                            MetadataKey.MasterEditionV1
                        ) {
                          value = WinningConfigType.PrintingV1;
                        }
                        myNewTier.winningConfigType = value;
                        props.setAttributes({
                          ...props.attributes,
                          tiers: newTiers,
                        });
                      }}
                    >
                      <Option value={WinningConfigType.FullRightsTransfer}>
                        Full Rights Transfer
                      </Option>
                      <Option value={WinningConfigType.TokenOnlyTransfer}>
                        Token Only Transfer
                      </Option>
                      <Option value={WinningConfigType.PrintingV2}>
                        Printing V2
                      </Option>

                      <Option value={WinningConfigType.PrintingV1}>
                        Printing V1
                      </Option>
                    </Select>

                    {((i as TierDummyEntry).winningConfigType ===
                      WinningConfigType.PrintingV1 ||
                      (i as TierDummyEntry).winningConfigType ===
                        WinningConfigType.PrintingV2) && (
                      <label className="action-field">
                        <span className="field-title">
                          How many copies do you want to create for each winner?
                          If you put 2, then each winner will get 2 copies.
                        </span>
                        <span className="field-info">
                          Each copy will be given unique edition number e.g. 1
                          of 30
                        </span>
                        <Input
                          autoFocus
                          className="input"
                          placeholder="Enter number of copies sold"
                          allowClear
                          onChange={info => {
                            const newTiers = newImmutableTiers(
                              props.attributes.tiers,
                            );

                            const myNewTier =
                              newTiers[configIndex].items[itemIndex];
                            myNewTier.amount = parseInt(info.target.value);
                            props.setAttributes({
                              ...props.attributes,
                              tiers: newTiers,
                            });
                          }}
                        />
                      </label>
                    )}
                  </>
                )}
              </Card>
            </Col>
          ))}
          <Col xl={4}>
            <Button
              type="primary"
              size="large"
              onClick={() => {
                const newTiers = newImmutableTiers(props.attributes.tiers);
                const myNewTier = newTiers[configIndex];
                myNewTier.items.push({});
                props.setAttributes({
                  ...props.attributes,
                  tiers: newTiers,
                });
              }}
              className="action-btn"
            >
              <PlusCircleOutlined />
            </Button>
          </Col>
        </Row>
      ))}
      <Row>
        <Col xl={24}>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              const newTiers = newImmutableTiers(props.attributes.tiers);
              newTiers.push({ items: [], winningSpots: [] });
              props.setAttributes({
                ...props.attributes,
                tiers: newTiers,
              });
            }}
            className="action-btn"
          >
            <PlusCircleOutlined />
          </Button>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue to Review
        </Button>
      </Row>
    </>
  );
};

const ParticipationStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Participation NFT</h2>
        <p>
          Provide NFT that will be awarded as an Open Edition NFT for auction
          participation.
        </p>
      </Row>
      <Row className="content-action">
        <Col className="section" xl={24}>
          <ArtSelector
            filter={(i: SafetyDepositDraft) =>
              !!i.masterEdition && i.masterEdition.info.maxSupply === undefined
            }
            selected={
              props.attributes.participationNFT
                ? [props.attributes.participationNFT]
                : []
            }
            setSelected={items => {
              props.setAttributes({
                ...props.attributes,
                participationNFT: items[0],
              });
            }}
            allowMultiple={false}
          >
            Select Participation NFT
          </ArtSelector>
          <label className="action-field">
            <span className="field-title">Price</span>
            <span className="field-info">
              This is an optional fixed price that non-winners will pay for your
              Participation NFT.
            </span>
            <Input
              type="number"
              min={0}
              autoFocus
              className="input"
              placeholder="Fixed Price"
              prefix="◎"
              suffix="SOL"
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  participationFixedPrice: parseFloat(info.target.value),
                })
              }
            />
          </label>
        </Col>
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={props.confirm}
          className="action-btn"
        >
          Continue to Review
        </Button>
      </Row>
    </>
  );
};

const ReviewStep = (props: {
  confirm: () => void;
  attributes: AuctionState;
  setAttributes: Function;
  connection: Connection;
}) => {
  const [cost, setCost] = useState(0);
  useEffect(() => {
    const rentCall = Promise.all([
      props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
      props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
    ]);

    // TODO: add
  }, [setCost]);

  let item = props.attributes.items?.[0];

  return (
    <>
      <Row className="call-to-action">
        <h2>Review and list</h2>
        <p>Review your listing before publishing.</p>
      </Row>
      <Row className="content-action">
        <Col xl={12}>
          {item?.metadata.info && (
            <ArtCard pubkey={item.metadata.pubkey} small={true} />
          )}
        </Col>
        <Col className="section" xl={12}>
          <Statistic
            className="create-statistic"
            title="Copies"
            value={
              props.attributes.editions === undefined
                ? 'Unique'
                : props.attributes.editions
            }
          />
          {cost ? (
            <AmountLabel title="Cost to Create" amount={cost} />
          ) : (
            <Spin />
          )}
        </Col>
      </Row>
      <Row style={{ display: 'block' }}>
        <Divider />
        <Statistic
          className="create-statistic"
          title="Start date"
          value={
            props.attributes.startSaleTS
              ? moment
                  .unix(props.attributes.startSaleTS as number)
                  .format('dddd, MMMM Do YYYY, h:mm a')
              : 'Right after successfully published'
          }
        />
        <br />
        {props.attributes.startListTS && (
          <Statistic
            className="create-statistic"
            title="Listing go live date"
            value={moment
              .unix(props.attributes.startListTS as number)
              .format('dddd, MMMM Do YYYY, h:mm a')}
          />
        )}
        <Divider />
        <Statistic
          className="create-statistic"
          title="Sale ends"
          value={
            props.attributes.endTS
              ? moment
                  .unix(props.attributes.endTS as number)
                  .format('dddd, MMMM Do YYYY, h:mm a')
              : 'Until sold'
          }
        />
      </Row>
      <Row>
        <Button
          type="primary"
          size="large"
          onClick={() => {
            props.setAttributes({
              ...props.attributes,
              startListTS: props.attributes.startListTS || moment().unix(),
              startSaleTS: props.attributes.startSaleTS || moment().unix(),
            });
            props.confirm();
          }}
          className="action-btn"
        >
          {props.attributes.category === AuctionCategory.InstantSale
            ? 'List for Sale'
            : 'Publish Auction'}
        </Button>
      </Row>
    </>
  );
};

const WaitingStep = (props: {
  createAuction: () => Promise<void>;
  confirm: () => void;
}) => {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const func = async () => {
      const inte = setInterval(
        () => setProgress(prog => Math.min(prog + 1, 99)),
        600,
      );
      await props.createAuction();
      clearInterval(inte);
      props.confirm();
    };
    func();
  }, []);

  return (
    <div
      style={{
        marginTop: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Progress type="circle" percent={progress} />
      <div className="waiting-title">
        Your creation is being listed with Metaplex...
      </div>
      <div className="waiting-subtitle">This can take up to 30 seconds.</div>
    </div>
  );
};

const Congrats = (props: {
  auction?: {
    vault: StringPublicKey;
    auction: StringPublicKey;
    auctionManager: StringPublicKey;
  };
}) => {
  const history = useHistory();

  const newTweetURL = () => {
    const params = {
      text: "I've created a new NFT auction on Metaplex, check it out!",
      url: `${
        window.location.origin
      }/#/auction/${props.auction?.auction.toString()}`,
      hashtags: 'NFT,Crypto,Metaplex',
      // via: "Metaplex",
      related: 'Metaplex,Solana',
    };
    const queryParams = new URLSearchParams(params).toString();
    return `https://twitter.com/intent/tweet?${queryParams}`;
  };

  return (
    <>
      <div
        style={{
          marginTop: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div className="waiting-title">
          Congratulations! Your auction is now live.
        </div>
        <div className="congrats-button-container">
          <Button
            className="metaplex-button"
            onClick={_ => window.open(newTweetURL(), '_blank')}
          >
            <span>Share it on Twitter</span>
            <span>&gt;</span>
          </Button>
          <Button
            className="metaplex-button"
            onClick={_ =>
              history.push(`/auction/${props.auction?.auction.toString()}`)
            }
          >
            <span>See it in your auctions</span>
            <span>&gt;</span>
          </Button>
        </div>
      </div>
      <Confetti />
    </>
  );
};
