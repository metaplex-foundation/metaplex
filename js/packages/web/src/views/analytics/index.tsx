import React, { useState } from 'react';
import { Layout, Row, Col, Spin } from 'antd';
import { useMeta } from '../../contexts';
import { Store, WinningConfigType } from '../../models/metaplex';
import {
  getAuctionExtended,
  Metadata,
  ParsedAccount,
  programIds,
  useConnection,
  useWallet,
} from '@oyster/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { WalletAdapter } from '@solana/wallet-base';
import { AuctionView, AuctionViewState, useAuctions } from '../../hooks';
import { useMemo } from 'react';
import { QUOTE_MINT } from '../../constants';

const { Content } = Layout;
export const AnalyticsView = () => {
  const { store } = useMeta();
  const connection = useConnection();
  const { wallet, connected } = useWallet();

  return store && connection && wallet && connected ? (
    <InnerAnalytics />
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

function InnerAnalytics() {
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

  useMemo(() => {
    const t = async function () {
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

        newUsersPublished[auction.auctionManager.info.authority.toBase58()] =
          true;
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

      setByType(newByType);
      setAverageBids(averageBidders / totalAuctions);
      setUsersPublished(newUsersPublished);
      setUsersEngaged(engaged => ({ ...engaged, ...existingUsersEngaged }));
      setAverageSale(newAverageSale / totalAuctions);
      setHighestSale(newHighestSale);
      setSortedSales(newSortedSales.sort());
    };
    t();
  }, [auctions, auctionDataExtended]);

  useMemo(() => {
    const newBuild: Record<string, boolean> = {};
    const existingUsersEngaged = { ...usersEngaged };
    Object.values(bidderPotsByAuctionAndBidder).forEach(acct => {
      newBuild[acct.info.bidderAct.toBase58()] = true;
      existingUsersEngaged[acct.info.bidderAct.toBase58()] = true;
    });
    setUsersBid(newBuild);
    setUsersEngaged(engaged => ({ ...engaged, ...existingUsersEngaged }));
  }, [bidderPotsByAuctionAndBidder]);

  useMemo(() => {
    const newBuild: Record<string, boolean> = {};
    const existingUsersEngaged = { ...usersEngaged };
    metadata.forEach(acct => {
      newBuild[acct.info.updateAuthority.toBase58()] = true;
      existingUsersEngaged[acct.info.updateAuthority.toBase58()] = true;
      acct.info.data.creators?.forEach(c => {
        newBuild[c.address.toBase58()] = true;
        existingUsersEngaged[c.address.toBase58()] = true;
      });
    });
    setUsersWithMetadata(newBuild);
    setUsersEngaged(engaged => ({ ...engaged, ...existingUsersEngaged }));
  }, [metadata]);

  console.log('Users with metadata', Object.values(usersWithMetadata).length);
  console.log('Users with bids', Object.values(usersBid).length);
  console.log(
    'Users with published auctions',
    Object.values(usersPublished).length,
  );
  console.log('Users with engagement', Object.values(usersEngaged).length);

  console.log('Highest sale', highestSale);
  console.log('Average sale', averageSale);
  console.log('Average bids per auction', averageBids);
  console.log('Counts by type', byType);
  console.log('Total NFTs', totalNFTs);
  console.log('Total marketplaces', totalMarketplaces);
  return (
    <Content>
      <Col style={{ marginTop: 10 }}>
        <Row></Row>
      </Col>
    </Content>
  );
}
