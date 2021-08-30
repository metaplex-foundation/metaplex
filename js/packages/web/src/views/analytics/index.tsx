import React, { Dispatch, SetStateAction, useState } from 'react';
import { Layout, Button, Col, Spin } from 'antd';
import { useMeta } from '../../contexts';
import { AuctionManagerV2, WinningConfigType } from '../../models/metaplex';
import { Pie, Bar } from 'react-chartjs-2';
import {
  AuctionDataExtended,
  BidderPot,
  fromLamports,
  getAuctionExtended,
  Metadata,
  ParsedAccount,
  programIds,
  useMint,
} from '@oyster/common';
import { AuctionView, useAuctions } from '../../hooks';
import { QUOTE_MINT } from '../../constants';
import { MintInfo } from '@solana/spl-token';
import { AuctionManagerV1 } from '../../models/metaplex/deprecatedStates';

const { Content } = Layout;
export const AnalyticsView = () => {
  const mint = useMint(QUOTE_MINT);
  return mint ? <InnerAnalytics mint={mint} /> : <Spin />;
};

enum AuctionType {
  Open,
  Limited,
  Tiered,
  OneOfKind,
}

const LOOKUP: Record<string, string> = {};

const rerun = async ({
  auctionViews,
  auctionManagersByAuction,
  usersEngaged,
  auctionDataExtended,
  bidderPotsByAuctionAndBidder,
  metadata,
  setByType,
  setAverageBids,
  setUsersPublished,
  setAverageSale,
  setHighestSale,
  setSortedSales,
  setUsersWithMetadata,
  setUsersBid,
  setUsersEngaged,
}: {
  auctionViews: AuctionView[];
  auctionManagersByAuction: Record<
    string,
    ParsedAccount<AuctionManagerV1 | AuctionManagerV2>
  >;
  usersEngaged: Record<string, boolean>;
  auctionDataExtended: Record<string, ParsedAccount<AuctionDataExtended>>;
  bidderPotsByAuctionAndBidder: Record<string, ParsedAccount<BidderPot>>;
  metadata: ParsedAccount<Metadata>[];
  setByType: (rec: Record<AuctionType, number>) => void;
  setAverageBids: (num: number) => void;
  setUsersPublished: (rec: Record<string, boolean>) => void;
  setAverageSale: (num: number) => void;
  setHighestSale: (num: number) => void;
  setSortedSales: (num: number[]) => void;
  setUsersWithMetadata: (rec: Record<string, boolean>) => void;
  setUsersBid: (rec: Record<string, boolean>) => void;
  setUsersEngaged: Dispatch<SetStateAction<Record<string, boolean>>>;
}) => {
  let averageBidders = 0;
  let newAverageSale = 0;
  let newHighestSale = 0;
  let totalAuctions = 0;
  const newByType: Record<AuctionType, number> = {
    [AuctionType.Open]: 0,
    [AuctionType.Limited]: 0,
    [AuctionType.Tiered]: 0,
    [AuctionType.OneOfKind]: 0,
  };
  const newUsersPublished: Record<string, boolean> = {};
  const existingUsersEngaged = { ...usersEngaged };
  let newSortedSales: number[] = [];
  const PROGRAM_IDS = programIds();

  for (let i = 0; i < auctionViews.length; i++) {
    const auction = auctionViews[i];
    // Not entirely correct because we're not covering open edition auction bids
    // and their amounts which are super hard to track, but I think they
    // are probably a minority anyway.
    if (
      auction.auction.info.ended() &&
      auction.auction.info.tokenMint === QUOTE_MINT.toBase58()
    ) {
      if (!LOOKUP[auction.auction.pubkey]) {
        LOOKUP[auction.auction.pubkey] = await getAuctionExtended({
          auctionProgramId: PROGRAM_IDS.auction,
          resource: auction.vault.pubkey,
        });
      }
      const extended = auctionDataExtended[LOOKUP[auction.auction.pubkey]];
      if (extended && extended.info.totalUncancelledBids.toNumber() > 0) {
        totalAuctions++;
        averageBidders += extended.info.totalUncancelledBids.toNumber();
        const bids = auction.auction.info.bidState;
        let highestBid = bids.getAmountAt(0);
        if (highestBid && highestBid.toNumber() > newHighestSale) {
          newHighestSale = highestBid.toNumber();
        }
        const allWinningBids = bids.bids
          .slice(bids.bids.length - bids.max.toNumber())
          .map(i => i.amount.toNumber());
        newAverageSale += allWinningBids.reduce((acc, r) => (acc += r), 0);
        newSortedSales = newSortedSales.concat(allWinningBids);
      }
    }

    newUsersPublished[auction.auctionManager.authority] = true;
    existingUsersEngaged[auction.auctionManager.authority] = true;

    let type: AuctionType | undefined = undefined;
    if (auction.items.find(set => set.length > 1)) {
      type = AuctionType.Tiered;
    } else if (auction.items.length && auction.items[0].length) {
      type =
        auction.items[0][0].winningConfigType ==
        WinningConfigType.TokenOnlyTransfer
          ? AuctionType.OneOfKind
          : AuctionType.Limited;
    } else {
      type = AuctionType.Open;
    }

    newByType[type]++;
  }

  const newUsersBid: Record<string, boolean> = {};
  Object.values(bidderPotsByAuctionAndBidder).forEach(acct => {
    if (auctionManagersByAuction[acct.info.auctionAct]) {
      newUsersBid[acct.info.bidderAct] = true;
      existingUsersEngaged[acct.info.bidderAct] = true;
    }
  });

  const newBuild: Record<string, boolean> = {};
  metadata.forEach(acct => {
    newBuild[acct.info.updateAuthority] = true;
    existingUsersEngaged[acct.info.updateAuthority] = true;
    acct.info.data.creators?.forEach(c => {
      newBuild[c.address] = true;
      existingUsersEngaged[c.address] = true;
    });
  });

  setByType(newByType);
  setAverageBids(averageBidders / totalAuctions);
  setUsersPublished(newUsersPublished);
  setAverageSale(newAverageSale / totalAuctions);
  setHighestSale(newHighestSale);
  setSortedSales(newSortedSales.sort());
  setUsersWithMetadata(newBuild);
  setUsersBid(newUsersBid);
  setUsersEngaged(engaged => ({ ...engaged, ...existingUsersEngaged }));
};

const MemoizedBar = React.memo(
  (props: { sortedSales: number[]; mint: MintInfo }) => {
    const histogrammedData: Record<number, number> = {
      0: 0,
      5: 0,
      20: 0,
      50: 0,
      100: 0,
      500: 0,
      1000: 0,
      10000: 0,
    };
    const asArray = [0, 5, 20, 50, 100, 500, 1000, 10000];

    for (let i = 0; i < asArray.length; i++) {
      const currRange = asArray[i];

      if (i < asArray.length - 1) {
        const nextRange = asArray[i + 1];
        histogrammedData[currRange] = props.sortedSales.filter(
          s =>
            fromLamports(s, props.mint) >= currRange &&
            fromLamports(s, props.mint) < nextRange,
        ).length;
      } else {
        histogrammedData[currRange] = props.sortedSales.filter(
          s => fromLamports(s, props.mint) >= currRange,
        ).length;
      }
    }

    const histoData = {
      labels: [
        '◎ [0 - 5)',
        '◎ [5 - 20)',
        '◎ [20 - 50)',
        '◎ [50 - 100)',
        '◎ [100 - 500)',
        '◎ [500 - 1000)',
        '◎ [1000 - 10000)',
        '◎ [10000 -',
      ],
      datasets: [
        {
          label: '# bids in these bins',
          data: asArray.map(a => histogrammedData[a]),
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
            'rgba(153, 102, 255, 0.2)',
            'rgba(255, 159, 64, 0.2)',
            'rgba(255, 139, 24, 0.2)',
            'rgba(212, 39, 24, 0.2)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(255, 139, 24, 1)',
            'rgba(212, 39, 24, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    const histoOptions = {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
      },
    };

    return <Bar data={histoData} options={histoOptions} />;
  },
);

const MemoizedPie = React.memo(
  (props: { byType: Record<AuctionType, number> }) => {
    const pieData = {
      labels: ['Open', 'Limited', 'Tiered', 'One of a Kind'],
      datasets: [
        {
          label: '#',
          data: [
            props.byType[AuctionType.Open],
            props.byType[AuctionType.Limited],
            props.byType[AuctionType.Tiered],
            props.byType[AuctionType.OneOfKind],
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.2)',
            'rgba(54, 162, 235, 0.2)',
            'rgba(255, 206, 86, 0.2)',
            'rgba(75, 192, 192, 0.2)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    return <Pie data={pieData} />;
  },
);

function InnerAnalytics({ mint }: { mint: MintInfo }) {
  const [usersWithMetadata, setUsersWithMetadata] = useState<
    Record<string, boolean>
  >({});
  const [usersPublished, setUsersPublished] = useState<Record<string, boolean>>(
    {},
  );
  const [usersBid, setUsersBid] = useState<Record<string, boolean>>({});

  const [usersEngaged, setUsersEngaged] = useState<Record<string, boolean>>({});
  const [byType, setByType] = useState<Record<AuctionType, number>>({
    [AuctionType.Open]: 0,
    [AuctionType.Limited]: 0,
    [AuctionType.Tiered]: 0,
    [AuctionType.OneOfKind]: 0,
  });
  const [averageBids, setAverageBids] = useState<number>(0);
  const [averageSale, setAverageSale] = useState<number>(0);
  const [highestSale, setHighestSale] = useState<number>(0);

  const [sortedSales, setSortedSales] = useState<number[]>([]);
  const {
    metadata,
    stores,
    auctionManagersByAuction,
    bidderPotsByAuctionAndBidder,
    auctionDataExtended,
  } = useMeta();

  const totalNFTs = metadata.length;
  const totalMarketplaces = Object.values(stores).length;

  const auctionViews = useAuctions();

  return (
    <Content>
      <Col style={{ marginTop: 10 }}>
        <Button
          type="primary"
          size="large"
          className="action-btn"
          onClick={() =>
            rerun({
              auctionViews,
              auctionManagersByAuction,
              usersEngaged,
              auctionDataExtended,
              bidderPotsByAuctionAndBidder,
              metadata,
              setByType,
              setAverageBids,
              setUsersPublished,
              setAverageSale,
              setHighestSale,
              setSortedSales,
              setUsersWithMetadata,
              setUsersBid,
              setUsersEngaged,
            })
          }
        >
          RERUN CALCULATION
        </Button>
        <h1>Overview</h1>
        <h3>
          Total NFTs: {totalNFTs} Total Marketplaces: {totalMarketplaces}
        </h3>
        <h1>User Breakdown</h1>
        <h3>Any Engagement: {Object.values(usersEngaged).length}</h3>
        <h3>That bid: {Object.values(usersBid).length}</h3>
        <h3>That sold items: {Object.values(usersPublished).length}</h3>
        <h3>That minted NFTs: {Object.values(usersWithMetadata).length}</h3>
        <h1>Sale Info</h1>
        <h3>
          Total Sales: ◎
          {fromLamports(
            sortedSales.reduce((acc, r) => (acc += r), 0),
            mint,
          )}
        </h3>
        <MemoizedBar sortedSales={sortedSales} mint={mint} />

        <h3>Highest Sale: ◎ {fromLamports(highestSale, mint)}</h3>
        <h3>Average Sale: ◎ {fromLamports(averageSale, mint)}</h3>
        <h1>Auction Info</h1>
        <h3>Average Bids per Auction: {averageBids}</h3>
        <MemoizedPie byType={byType} />
      </Col>
    </Content>
  );
}
