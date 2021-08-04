import React, { Dispatch, SetStateAction, useState } from 'react';
import { Layout, Button, Col, Spin } from 'antd';
import { useMeta } from '../../contexts';
import { WinningConfigType } from '../../models/metaplex';
import { Pie, Bar } from 'react-chartjs-2';
import {
  AuctionDataExtended,
  BidderPot,
  fromLamports,
  getAuctionExtended,
  Metadata,
  ParsedAccount,
  programIds,
  useConnection,
  useMint,
  useWallet,
} from '@oyster/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-base';
import { AuctionView, AuctionViewState, useAuctions } from '../../hooks';
import { useMemo } from 'react';
import { QUOTE_MINT } from '../../constants';
import { MintInfo } from '@solana/spl-token';

const { Content } = Layout;
export const AnalyticsView = () => {
  const { store } = useMeta();
  const connection = useConnection();
  const { wallet, connected } = useWallet();
  const mint = useMint(QUOTE_MINT);

  return mint && store && connection && wallet && connected ? (
    <MemoizedInnerAnalytics mint={mint} />
  ) : (
    <Spin />
  );
};

enum AuctionType {
  Open,
  Limited,
  Tiered,
  OneOfKind,
}

const LOOKUP: Record<string, string> = {};

const rerun = async ({
  auctions,
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
  auctions: AuctionView[];
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

  for (let i = 0; i < auctions.length; i++) {
    const auction = auctions[i];
    // Not entirely correct because we're not covering open edition auction bids
    // and their amounts which are super hard to track, but I think they
    // are probably a minority anyway.
    if (
      auction.auction.info.ended() &&
      auction.auction.info.tokenMint.equals(QUOTE_MINT)
    ) {
      if (!LOOKUP[auction.auction.pubkey.toBase58()]) {
        LOOKUP[auction.auction.pubkey.toBase58()] = (
          await getAuctionExtended({
            auctionProgramId: PROGRAM_IDS.auction,
            resource: auction.vault.pubkey,
          })
        ).toBase58();
      }
      const extended =
        auctionDataExtended[LOOKUP[auction.auction.pubkey.toBase58()]];
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

    newUsersPublished[auction.auctionManager.info.authority.toBase58()] = true;
    existingUsersEngaged[auction.auctionManager.info.authority.toBase58()] =
      true;

    let type: AuctionType | undefined = undefined;
    if (auction.items.find(set => set.length > 1)) {
      type = AuctionType.Tiered;
    } else if (auction.items.length && auction.items[0].length) {
      type =
        auction.auctionManager.info.settings.winningConfigs[0].items[0]
          .winningConfigType == WinningConfigType.TokenOnlyTransfer
          ? AuctionType.OneOfKind
          : AuctionType.Limited;
    } else {
      type = AuctionType.Open;
    }

    newByType[type]++;
  }

  const newUsersBid: Record<string, boolean> = {};
  Object.values(bidderPotsByAuctionAndBidder).forEach(acct => {
    newUsersBid[acct.info.bidderAct.toBase58()] = true;
    existingUsersEngaged[acct.info.bidderAct.toBase58()] = true;
  });

  const newBuild: Record<string, boolean> = {};
  metadata.forEach(acct => {
    newBuild[acct.info.updateAuthority.toBase58()] = true;
    existingUsersEngaged[acct.info.updateAuthority.toBase58()] = true;
    acct.info.data.creators?.forEach(c => {
      newBuild[c.address.toBase58()] = true;
      existingUsersEngaged[c.address.toBase58()] = true;
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

const MemoizedInnerAnalytics = React.memo(InnerAnalytics);
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
    bidderPotsByAuctionAndBidder,
    auctionDataExtended,
  } = useMeta();

  const totalNFTs = metadata.length;
  const totalMarketplaces = Object.values(stores).length;

  const auctions = useAuctions();

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
      histogrammedData[currRange] = sortedSales.filter(
        s =>
          fromLamports(s, mint) >= currRange &&
          fromLamports(s, mint) < nextRange,
      ).length;
    } else {
      histogrammedData[currRange] = sortedSales.filter(
        s => fromLamports(s, mint) >= currRange,
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
  const pieData = {
    labels: ['Open', 'Limited', 'Tiered', 'One of a Kind'],
    datasets: [
      {
        label: '#',
        data: [
          byType[AuctionType.Open],
          byType[AuctionType.Limited],
          byType[AuctionType.Tiered],
          byType[AuctionType.OneOfKind],
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

  return (
    <Content>
      <Col style={{ marginTop: 10 }}>
        <Button
          type="primary"
          size="large"
          className="action-btn"
          onClick={() =>
            rerun({
              auctions,
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
        <Bar data={histoData} options={histoOptions} />

        <h3>Highest Sale: ◎ {fromLamports(highestSale, mint)}</h3>
        <h3>Average Sale: ◎ {fromLamports(averageSale, mint)}</h3>
        <h1>Auction Info</h1>
        <h3>Average Bids per Auction: {averageBids}</h3>
        <Pie data={pieData} />
      </Col>
    </Content>
  );
}
