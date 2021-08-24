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
  Radio,
  Select,
  Typography
} from 'antd';
import { QUOTE_MINT } from './../../constants';
import { Confetti } from './../../components/Confetti';
import { ArtSelector } from './artSelector';
import {
  useConnection,
  useWallet,
  WinnerLimit,
  WinnerLimitType,
  toLamports,
  useMint,
  Creator,
  PriceFloor,
  PriceFloorType,
  IPartialCreateAuctionArgs,
  ConnectButton,
  StringPublicKey
} from '@oyster/common';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { MintLayout } from '@solana/spl-token';
import { useHistory, useParams } from 'react-router-dom';
import { capitalize } from 'lodash';
import {
  WinningConfigType,
  AmountRange,
} from '../../models/metaplex';
import moment from 'moment';
import {
  createAuctionManager,
  SafetyDepositDraft,
} from '../../actions/createAuctionManager';
import BN from 'bn.js';
import { DateTimePicker } from '../../components/DateTimePicker';
import { useApes, useMeta } from '../../contexts';
import useWindowDimensions from '../../utils/layout';
import { PlusCircleOutlined } from '@ant-design/icons';
import { SystemProgram } from '@solana/web3.js';
import { useUserArts } from '../../hooks';
import { StringParam, useQueryParam } from 'use-query-params';
import { AmountLabel } from '../../components/AmountLabel';
import { ArtCard } from '../../components/ArtCard';
const ZERO = new BN(0);

const { Option } = Select;
const { Step } = Steps;
const {Title} = Typography;

export enum AuctionCategory {
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
  saleType?: 'auction' | 'sale';

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
}

export const AuctionCreateView = () => {
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  const { whitelistedCreatorsByCreator, isLoading } = useMeta();
  const { step_param }: { step_param: string } = useParams();
  const history = useHistory();
  const mint = useMint(QUOTE_MINT);
  const { width } = useWindowDimensions();
  const [ape, setApe] = useState();

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
    category: AuctionCategory.Single,
    saleType: 'auction',
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
    if (attributes.category === AuctionCategory.Open) {
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

    const auctionSettings: IPartialCreateAuctionArgs = {
      winners: winnerLimit,
      endAuctionAt: new BN(
        (attributes.auctionDuration || 0) *
          (attributes.auctionDurationType == 'days'
            ? 60 * 60 * 24 // 1 day in seconds
            : attributes.auctionDurationType == 'hours'
            ? 60 * 60 // 1 hour in seconds
            : 60), // 1 minute in seconds
      ), // endAuctionAt is actually auction duration, poorly named, in seconds
      auctionGap: new BN(
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
    );
    setAuctionObj(_auctionObj);
  };

  const copiesStep = (
    <CopiesStep
      attributes={attributes}
      setAttributes={setAttributes}
      setApe={setApe}
      apeData={ape}
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

  const typeStep = (
    <SaleTypeStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );

  const priceStep = (
    <PriceStep
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
    <EndingPhaseStep
      attributes={attributes}
      setAttributes={setAttributes}
      confirm={() => gotoNextStep()}
    />
  );
  
  // const tierTableStep = (
  //   <TierTableStep
  //     attributes={tieredAttributes}
  //     setAttributes={setTieredAttributes}
  //     maxWinners={attributes.winnersCount}
  //     confirm={() => gotoNextStep()}
  //   />
  // );

  const reviewStep = (
    <ReviewStep
      attributes={attributes}
      setAttributes={setAttributes}
      ape={ape}
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
    [AuctionCategory.Limited]: [
      // ['Category', categoryStep],
      // ['Copies', copiesStep],
      // ['Sale Type', typeStep],
      // ['Price', priceStep],
      // ['Initial Phase', initialStep],
      // ['Ending Phase', endingStep],
      // ['Participation NFT', participationStep],
      // ['Review', reviewStep],
      // ['Publish', waitStep],
      // [undefined, congratsStep],
    ],
    [AuctionCategory.Single]: [
      // ['Category', categoryStep],
      ['Copies', copiesStep],
      ['Price', priceStep],
      ['Initial Phase', initialStep],
      ['Ending Phase', endingStep],
      // ['Participation NFT', participationStep],
      ['Review', reviewStep],
      ['Publish', waitStep],
      [undefined, congratsStep],
    ],
    [AuctionCategory.Open]: [
      // ['Category', categoryStep],
      // ['Copies', copiesStep],
      // ['Price', priceStep],
      // ['Initial Phase', initialStep],
      // ['Ending Phase', endingStep],
      // ['Review', reviewStep],
      // ['Publish', waitStep],
      // [undefined, congratsStep],
    ],
    [AuctionCategory.Tiered]: [
      // ['Category', categoryStep],
      // ['Winners', winnersStep],
      // ['Tiers', tierTableStep],
      // ['Price', priceStep],
      // ['Initial Phase', initialStep],
      // ['Ending Phase', endingStep],
      // ['Participation NFT', participationStep],
      // ['Review', reviewStep],
      // ['Publish', waitStep],
      // [undefined, congratsStep],
    ],
  };

  return (
    <>
      {!connected && <ConnectButton loading={isLoading} style={{ margin: '0.5rem auto', display: 'block' }} type="primary" size="large" shape="round">
        {isLoading ? '' : 'Connect to trade apes'}
      </ConnectButton>}
      {connected && <Row className="auction-create" style={{ paddingTop: width < 768 ? 0 : 50 }}>
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
                padding: '0 0.5rem'
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
              <Button 
                        type="primary"
                        size="large"
                        className="action-btn"
              onClick={() => gotoNextStep(step - 1)}>Back</Button>
            </div>
          )}
        </Col>
      </Row>}
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

const CopiesStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
  setApe: (ape:any) => void;
  apeData: any
}) => {
  const {apes} = useApes();
  const [mintedToken, setMintedToken] = useQueryParam('minted_token_pubkey', StringParam);
  let items = useUserArts();

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

  useEffect(() => {
    if (props?.apeData?.metadata?.minted_token_pubkey) {
      setMintedToken(props.apeData.metadata.minted_token_pubkey);
    }
  }, [props.apeData?.name, mintedToken])

  useEffect(() => {
    const meta = apes.find(a => mintedToken === a.metadata.minted_token_pubkey);
    const s = items.find(item => item.metadata.info.mint.toString() === mintedToken); 
    if (s) {
      props.setAttributes({...props.attributes, items: [s]});
    }
    if (meta && !props.apeData) {
      fetch(meta.attributes.image_url).then(res => res.json()).then((res) => {
        props.setApe(res);
      })
    }

  }, [apes, mintedToken, props.apeData?.name])

  let overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i);

  return (
    <>
      <Row className="call-to-action" style={{ marginBottom: 0 }}>
        <Title level={2}>Select which ape to sell</Title>
      </Row>
      <Row className="content-action">
        <Col span={24}>
          <ArtSelector
            filter={overallFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items });
            }}
            setApe={props.setApe}
            allowMultiple={false}
          >
            Select Ape
          </ArtSelector>
        </Col>
      </Row>
      {!!props?.attributes?.items?.length && 
        <>
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
      }
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
        <Col className="section" span={24}>
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

const SaleTypeStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      <Row className="call-to-action">
        <h2>Sale Type</h2>
        <p>Sell a limited copy or copies of a single Master NFT.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" span={24}>
          <label className="action-field">
            <span className="field-title">
              How do you want to sell your NFT(s)?
            </span>
            <Radio.Group
              defaultValue={props.attributes.saleType}
              onChange={info =>
                props.setAttributes({
                  ...props.attributes,
                  saleType: info.target.value,
                })
              }
            >
              <Radio className="radio-field" value="auction">
                Auction
              </Radio>
              <div className="radio-subtitle">
                Allow bidding on your NFT(s).
              </div>
            </Radio.Group>
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

const PriceStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      {props.attributes.saleType === 'auction' ? (
        <PriceAuction {...props} />
      ) : (
        <PriceSale {...props} />
      )}
    </>
  );
};

const PriceSale = (props: {
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
        <label className="action-field">
          <span className="field-title">Sale price</span>
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
                price: parseFloat(info.target.value) || undefined,
              })
            }
          />
        </label>
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
        <Col className="section" span={24}>
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
        <Col span={24}>
            {/* <strong style={{display: 'block', margin: '0 auto', textAlign: 'center'}}>5% of trading will go to ApeShit Social Club!</strong> */}
              {/* <br /> */}
              <Button
                type="primary"
                size="large"
                onClick={props.confirm}
                className="action-btn"
              >
                Continue
              </Button>
        </Col>
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
        <p>Set the terms for your {props.attributes.saleType}.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" span={24}>
          <label className="action-field">
            <span className="field-title">
              When do you want the {props.attributes.saleType} to begin?
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
                <span className="field-title">
                  {capitalize(props.attributes.saleType)} Start Date
                </span>
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

const EndingPhaseStep = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  return (
    <>
      {props.attributes.saleType === 'auction' ? (
        <EndingPhaseAuction {...props} />
      ) : (
        <EndingPhaseSale {...props} />
      )}
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
        <Title level={2}>Ending Phase</Title>
        <p>Set the terms for your auction.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" span={24}>
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

const EndingPhaseSale = (props: {
  attributes: AuctionState;
  setAttributes: (attr: AuctionState) => void;
  confirm: () => void;
}) => {
  const startMoment = props.attributes.startSaleTS
    ? moment.unix(props.attributes.startSaleTS)
    : moment();
  const [untilSold, setUntilSold] = useState<boolean>(true);
  const [endMoment, setEndMoment] = useState<moment.Moment | undefined>(
    props.attributes.endTS ? moment.unix(props.attributes.endTS) : undefined,
  );

  useEffect(() => {
    props.setAttributes({
      ...props.attributes,
      endTS: endMoment && endMoment.unix(),
    });
  }, [endMoment]);

  useEffect(() => {
    if (untilSold) setEndMoment(undefined);
    else setEndMoment(startMoment);
  }, [untilSold]);

  return (
    <>
      <Row className="call-to-action">
      <Title level={2}>Ending Phase</Title>
        <p>Set the terms for your sale.</p>
      </Row>
      <Row className="content-action">
        <Col className="section" span={24}>
          <label className="action-field">
            <span className="field-title">
              When do you want the sale to end?
            </span>
            <Radio.Group
              defaultValue="now"
              onChange={info => setUntilSold(info.target.value === 'now')}
            >
              <Radio className="radio-field" value="now">
                Until sold
              </Radio>
              <div className="radio-subtitle">
                The sale will end once the supply goes to zero.
              </div>
              <Radio className="radio-field" value="later">
                At a specified date
              </Radio>
              <div className="radio-subtitle">
                The sale will end at this date, regardless if there is remaining
                supply.
              </div>
            </Radio.Group>
          </label>

          {!untilSold && (
            <label className="action-field">
              <span className="field-title">End Date</span>
              {endMoment && (
                <DateTimePicker
                  momentObj={endMoment}
                  setMomentObj={setEndMoment}
                  datePickerProps={{
                    disabledDate: (current: moment.Moment) =>
                      current && current < startMoment,
                  }}
                />
              )}
            </label>
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

const ReviewStep = (props: {
  confirm: () => void;
  attributes: AuctionState;
  setAttributes: Function;
  connection: Connection;
  ape?: any
}) => {
  // const [cost, setCost] = useState(0);
  // useEffect(() => {
  //   const rentCall = Promise.all([
  //     props.connection.getMinimumBalanceForRentExemption(MintLayout.span),
  //     props.connection.getMinimumBalanceForRentExemption(MAX_METADATA_LEN),
  //   ]).then(r => {
  //     console.log(r);
  //     console.log(r[0] + r[1]);
  //     debugger
  //   });
  //   // TODO: add
  // }, [setCost]);


  let item = props.attributes.items?.[0];

  return (
    <>
      <Row className="call-to-action">
        <h2>Review and list</h2>
      </Row>
      <Row className="content-action">
        <Col lg={12} md={24} style={{width: '100%'}}>
          {}
          {item?.metadata.info && (
            <ArtCard 
              ape={props.ape} 
              hideMeta 
              pubkey={item.metadata.pubkey} 

            />
          )}
        </Col>
        <Col className="section" style={{padding: '0 1rem'}} lg={12} md={24}>
          <Statistic
            className="create-statistic"
            title="Copies"
            value={
              props.attributes.editions === undefined
                ? 'Unique'
                : props.attributes.editions
            }
          />
          <Row>
            <Col lg={24} md={12} style={{width: '48%'}}>
              <AmountLabel title="Price Floor" displayUSD={false} amount={props?.attributes?.priceFloor as number} />
            </Col>
            <Col lg={24} md={12} style={{width: '48%'}}>
              <AmountLabel title="Tick Size" displayUSD={false} amount={props?.attributes?.priceFloor as number} />
            </Col>
            {/* <Col span={24}>
              <strong>5% of trading will go to ApeShit Social Club!</strong>
            </Col> */}
          </Row>
          <br />
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
          Publish Auction
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
