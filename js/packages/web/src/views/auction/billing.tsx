import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Layout, Spin, Button, Table } from 'antd';
import {
  useArt,
  useAuction,
  AuctionView,
  useBidsForAuction,
} from '../../hooks';
import { ArtContent } from '../../components/ArtContent';
import {
  useConnection,
  contexts,
  BidderMetadata,
  ParsedAccount,
  cache,
  BidderPot,
  fromLamports,
  useMint,
  getBidderPotKey,
  programIds,
  Bid,
} from '@oyster/common';
import { useMeta } from '../../contexts';
import {
  getBidderKeys,
  getPayoutTicket,
  NonWinningConstraint,
  PayoutTicket,
  WinningConstraint,
} from '../../models/metaplex';
import './billing.less';
import { WalletAdapter } from '@solana/wallet-base';
import { Connection, PublicKey } from '@solana/web3.js';
import { settle } from '../../actions/settle';
import { MintInfo } from '@solana/spl-token';
const { useWallet } = contexts.Wallet;
const { Content } = Layout;

export const BillingView = () => {
  const { id } = useParams<{ id: string }>();
  const auctionView = useAuction(id);
  const connection = useConnection();
  const { wallet } = useWallet();
  const mint = useMint(auctionView?.auction.info.tokenMint);

  return auctionView && wallet && connection && mint ? (
    <InnerBillingView
      auctionView={auctionView}
      connection={connection}
      wallet={wallet}
      mint={mint}
    />
  ) : (
    <Spin />
  );
};

function getLosingParticipationPrice(
  el: ParsedAccount<BidderMetadata>,
  auctionView: AuctionView,
) {
  const nonWinnerConstraint =
    auctionView.auctionManager.info.settings.participationConfig
      ?.nonWinningConstraint;

  if (nonWinnerConstraint === NonWinningConstraint.GivenForFixedPrice)
    return (
      auctionView.auctionManager.info.settings.participationConfig?.fixedPrice?.toNumber() ||
      0
    );
  else if (nonWinnerConstraint === NonWinningConstraint.GivenForBidPrice)
    return el.info.lastBid.toNumber() || 0;
  else return 0;
}

function useWinnerPotsByBidderKey(
  auctionView: AuctionView,
): Record<string, ParsedAccount<BidderPot>> {
  const [pots, setPots] = useState<Record<string, ParsedAccount<BidderPot>>>(
    {},
  );
  const PROGRAM_IDS = programIds();

  const winningConfigLength =
    auctionView.auctionManager.info.settings.winningConfigs.length;
  const auction = auctionView.auction;
  const winners = auction.info.bidState.bids;
  const truWinners = useMemo(() => {
    return [...winners].reverse().slice(0, winningConfigLength);
  }, [winners, winningConfigLength]);

  useEffect(() => {
    (async () => {
      const promises: Promise<{ winner: Bid; key: PublicKey }>[] =
        truWinners.map(winner =>
          getBidderPotKey({
            auctionProgramId: PROGRAM_IDS.auction,
            auctionKey: auction.pubkey,
            bidderPubkey: winner.key,
          }).then(key => ({
            key,
            winner,
          })),
        );
      const values = await Promise.all(promises);

      const newPots = values.reduce((agg, value) => {
        const el = cache.get(value.key) as ParsedAccount<BidderPot>;
        if (el) {
          agg[value.winner.key.toBase58()] = el;
        }

        return agg;
      }, {} as Record<string, ParsedAccount<BidderPot>>);

      console.log('Final keys', Object.keys(newPots));
      setPots(newPots);
    })();
  }, [truWinners, setPots]);
  return pots;
}

function usePayoutTickets(
  auctionView: AuctionView,
): Record<string, { tickets: ParsedAccount<PayoutTicket>[]; sum: number }> {
  const { payoutTickets } = useMeta();
  const [foundPayoutTickets, setFoundPayoutTickets] = useState<
    Record<string, ParsedAccount<PayoutTicket>>
  >({});

  useEffect(() => {
    if (
      auctionView.items
        .flat()
        .map(i => i.metadata)
        .filter(i => !i).length
    ) {
      return;
    }
    const currFound = { ...foundPayoutTickets };
    // items are in exact order of winningConfigs + order of bid winners
    // when we moved to tiered auctions items will be array of arrays, remember this...
    // this becomes triple loop
    const prizeArrays = [
      ...auctionView.items,
      ...(auctionView.participationItem
        ? [[auctionView.participationItem]]
        : []),
    ];
    const payoutPromises: { key: string; promise: Promise<PublicKey> }[] = [];
    let total = 0;
    for (let i = 0; i < prizeArrays.length; i++) {
      const items = prizeArrays[i];
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const creators = item.metadata?.info?.data?.creators || [];
        const recipientAddresses = creators
          ? creators
              .map(c => c.address)
              .concat([auctionView.auctionManager.info.authority])
          : [auctionView.auctionManager.info.authority];

        for (let k = 0; k < recipientAddresses.length; k++) {
          // Ensure no clashes with tickets from other safety deposits in other winning configs even if from same creator by making long keys
          const key = `${auctionView.auctionManager.pubkey.toBase58()}-${i}-${j}-${item.safetyDeposit.pubkey.toBase58()}-${recipientAddresses[
            k
          ].toBase58()}-${k}`;

          if (!currFound[key]) {
            payoutPromises.push({
              key,
              promise: getPayoutTicket(
                auctionView.auctionManager.pubkey,
                item === auctionView.participationItem ? null : i,
                item === auctionView.participationItem ? null : j,
                k < recipientAddresses.length - 1 ? k : null,
                item.safetyDeposit.pubkey,
                recipientAddresses[k],
              ),
            });
            total += 1;
          }
        }
      }
    }
    Promise.all(payoutPromises.map(p => p.promise)).then(
      (payoutKeys: PublicKey[]) => {
        payoutKeys.forEach((payoutKey: PublicKey, i: number) => {
          if (payoutTickets[payoutKey.toBase58()])
            currFound[payoutPromises[i].key] =
              payoutTickets[payoutKey.toBase58()];
        });

        setFoundPayoutTickets(pt => ({ ...pt, ...currFound }));
      },
    );
  }, [
    Object.values(payoutTickets).length,
    auctionView.items
      .flat()
      .map(i => i.metadata)
      .filter(i => !!i).length,
  ]);

  return Object.values(foundPayoutTickets).reduce(
    (
      acc: Record<
        string,
        { tickets: ParsedAccount<PayoutTicket>[]; sum: number }
      >,
      el: ParsedAccount<PayoutTicket>,
    ) => {
      if (!acc[el.info.recipient.toBase58()]) {
        acc[el.info.recipient.toBase58()] = {
          sum: 0,
          tickets: [],
        };
      }
      acc[el.info.recipient.toBase58()].tickets.push(el);
      acc[el.info.recipient.toBase58()].sum += el.info.amountPaid.toNumber();
      return acc;
    },
    {},
  );
}

export const InnerBillingView = ({
  auctionView,
  wallet,
  connection,
  mint,
}: {
  auctionView: AuctionView;
  wallet: WalletAdapter;
  connection: Connection;
  mint: MintInfo;
}) => {
  const {
    bidRedemptions,
    bidderMetadataByAuctionAndBidder,
    bidderPotsByAuctionAndBidder,
    whitelistedCreatorsByCreator,
  } = useMeta();
  const art = useArt(auctionView.thumbnail.metadata.pubkey);
  const [escrowBalance, setEscrowBalance] = useState<number | undefined>();
  const [escrowBalanceRefreshCounter, setEscrowBalanceRefreshCounter] =
    useState(0);
  const auctionKey = auctionView.auction.pubkey.toBase58();

  useEffect(() => {
    connection
      .getTokenAccountBalance(auctionView.auctionManager.info.acceptPayment)
      .then(resp => {
        if (resp.value.uiAmount !== undefined && resp.value.uiAmount !== null)
          setEscrowBalance(resp.value.uiAmount);
      });
  }, [escrowBalanceRefreshCounter]);

  const [participationBidRedemptionKeys, setParticipationBidRedemptionKeys] =
    useState<Record<string, PublicKey>>({});

  const bids = useBidsForAuction(auctionView.auction.pubkey);

  const payoutTickets = usePayoutTickets(auctionView);
  const winners = [...auctionView.auction.info.bidState.bids]
    .reverse()
    .slice(0, auctionView.auctionManager.info.settings.winningConfigs.length);
  const winnerPotsByBidderKey = useWinnerPotsByBidderKey(auctionView);

  // Uncancelled bids or bids that were cancelled for refunds but only after redeemed
  // for participation
  const usableBids = bids.filter(
    b =>
      !b.info.cancelled ||
      bidRedemptions[
        participationBidRedemptionKeys[b.pubkey.toBase58()]?.toBase58()
      ]?.info.participationRedeemed,
  );

  let hasParticipation =
    auctionView.auctionManager.info.settings.participationConfig !==
      undefined &&
    auctionView.auctionManager.info.settings.participationConfig !== null;
  let participationEligible = hasParticipation ? usableBids : [];

  useMemo(async () => {
    const newKeys: Record<string, PublicKey> = {};

    for (let i = 0; i < bids.length; i++) {
      const o = bids[i];
      if (!participationBidRedemptionKeys[o.pubkey.toBase58()]) {
        newKeys[o.pubkey.toBase58()] = (
          await getBidderKeys(auctionView.auction.pubkey, o.info.bidderPubkey)
        ).bidRedemption;
      }
    }

    setParticipationBidRedemptionKeys({
      ...participationBidRedemptionKeys,
      ...newKeys,
    });
  }, [bids.length]);

  if (
    auctionView.auctionManager.info.settings.participationConfig
      ?.winnerConstraint === WinningConstraint.NoParticipationPrize
  )
    // Filter winners out of the open edition eligible
    participationEligible = participationEligible.filter(
      // winners are stored by pot key, not bidder key, so we translate
      b => !winnerPotsByBidderKey[b.info.bidderPubkey.toBase58()],
    );

  const nonWinnerConstraint =
    auctionView.auctionManager.info.settings.participationConfig
      ?.nonWinningConstraint;

  const participationEligibleRedeemable: ParsedAccount<BidderMetadata>[] = [];
  const participationEligibleUnredeemable: ParsedAccount<BidderMetadata>[] = [];

  participationEligible.forEach(o => {
    const isWinner = winnerPotsByBidderKey[o.info.bidderPubkey.toBase58()];
    // Winners automatically pay nothing for open editions, and are getting claimed anyway right now
    // so no need to add them to list
    if (isWinner) {
      return;
    }

    if (
      nonWinnerConstraint === NonWinningConstraint.GivenForFixedPrice ||
      nonWinnerConstraint === NonWinningConstraint.GivenForBidPrice
    ) {
      const key = participationBidRedemptionKeys[o.pubkey.toBase58()];
      if (key) {
        const redemption = bidRedemptions[key.toBase58()];
        if (!redemption || !redemption.info.participationRedeemed)
          participationEligibleUnredeemable.push(o);
      } else participationEligibleUnredeemable.push(o);
    }
  });

  const participationUnredeemedTotal = participationEligibleUnredeemable.reduce(
    (acc, el) => (acc += getLosingParticipationPrice(el, auctionView)),
    0,
  );

  // Winners always get it for free so pay zero for them - figure out among all
  // eligible open edition winners what is the total possible for display.
  const participationPossibleTotal = participationEligible.reduce((acc, el) => {
    const isWinner = winnerPotsByBidderKey[el.info.bidderPubkey.toBase58()];
    let price = 0;
    if (!isWinner) price = getLosingParticipationPrice(el, auctionView);

    return (acc += price);
  }, 0);

  const totalWinnerPayments = winners.reduce(
    (acc, w) => (acc += w.amount.toNumber()),
    0,
  );

  const winnersThatCanBeEmptied = Object.values(winnerPotsByBidderKey).filter(
    p => !p.info.emptied,
  );

  const bidsToClaim: {
    metadata: ParsedAccount<BidderMetadata>;
    pot: ParsedAccount<BidderPot>;
  }[] = [
    ...winnersThatCanBeEmptied.map(pot => ({
      metadata:
        bidderMetadataByAuctionAndBidder[
          `${auctionKey}-${pot.info.bidderAct.toBase58()}`
        ],
      pot,
    })),
    ...participationEligibleRedeemable.map(metadata => ({
      metadata,
      pot: bidderPotsByAuctionAndBidder[
        `${auctionKey}-${metadata.info.bidderPubkey.toBase58()}`
      ],
    })),
  ];

  return (
    <Content>
      <Col>
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={12}>
            <ArtContent
              category={art.category}
              uri={art.image}
              extension={art.image}
              files={art.files}
              className="artwork-image"
            />
          </Col>
          <Col span={12}>
            <div style={{ fontWeight: 700 }}>{art.title}</div>
            <br />
            <div className="info-header">TOTAL AUCTION VALUE</div>
            <div className="escrow">
              ◎
              {fromLamports(
                totalWinnerPayments + participationPossibleTotal,
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL AUCTION REDEEMED VALUE</div>
            <div className="escrow">
              ◎
              {fromLamports(
                totalWinnerPayments +
                  participationPossibleTotal -
                  participationUnredeemedTotal,
                mint,
              )}
            </div>
            <br />
            <div className="info-header">
              TOTAL COLLECTED BY ARTISTS AND AUCTIONEER
            </div>
            <div className="escrow">
              ◎
              {fromLamports(
                Object.values(payoutTickets).reduce(
                  (acc, el) => (acc += el.sum),
                  0,
                ),
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL UNSETTLED</div>
            <div className="escrow">
              ◎
              {fromLamports(
                bidsToClaim.reduce(
                  (acc, el) => (acc += el.metadata.info.lastBid.toNumber()),
                  0,
                ),
                mint,
              )}
            </div>
            <br />
            <div className="info-header">TOTAL IN ESCROW</div>
            <div className="escrow">
              {escrowBalance !== undefined ? `◎${escrowBalance}` : <Spin />}
            </div>
            <br />
            {hasParticipation && (
              <>
                <div className="info-header">
                  TOTAL UNREDEEMED PARTICIPATION FEES OUTSTANDING
                </div>
                <div className="outstanding-open-editions">
                  ◎{fromLamports(participationUnredeemedTotal, mint)}
                </div>
                <br />
              </>
            )}
            <br />
            <Button
              type="primary"
              size="large"
              className="action-btn"
              onClick={async () => {
                await settle(
                  connection,
                  wallet,
                  auctionView,
                  bidsToClaim.map(b => b.pot),
                );
                setEscrowBalanceRefreshCounter(ctr => ctr + 1);
              }}
            >
              SETTLE OUTSTANDING
            </Button>
          </Col>
        </Row>
        <Row>
          <Table
            style={{ width: '100%' }}
            columns={[
              {
                title: 'Name',
                dataIndex: 'name',
                key: 'name',
              },
              {
                title: 'Address',
                dataIndex: 'address',
                key: 'address',
              },
              {
                title: 'Amount Paid',
                dataIndex: 'amountPaid',
                render: (val: number) => (
                  <span>◎{fromLamports(val, mint)}</span>
                ),
                key: 'amountPaid',
              },
            ]}
            dataSource={Object.keys(payoutTickets).map(t => ({
              key: t,
              name: whitelistedCreatorsByCreator[t]?.info?.name || 'N/A',
              address: t,
              amountPaid: payoutTickets[t].sum,
            }))}
          />
        </Row>
      </Col>
    </Content>
  );
};
