import { useWallet } from '@solana/wallet-adapter-react';
import { Tabs } from 'antd';
import BN from 'bn.js';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuctionRenderCard } from '../../components/AuctionRenderCard';
import { Banner } from '../../components/Banner';
import { HowToBuyModal } from '../../components/HowToBuyModal';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useMeta } from '../../contexts';
import { AuctionView, AuctionViewState, useAuctions } from '../../hooks';

const { TabPane } = Tabs;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
}

export const AuctionListView = () => {
  const auctions = useAuctions(AuctionViewState.Live);
  const auctionsEnded = [
    ...useAuctions(AuctionViewState.Ended),
    ...useAuctions(AuctionViewState.BuyNow),
  ];
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading } = useMeta();
  const { connected, publicKey } = useWallet();

  // Check if the auction is primary sale or not
  const checkPrimarySale = (auc: AuctionView) => {
    let flag = 0;
    auc.items.forEach(i => {
      i.forEach(j => {
        if (j.metadata.info.primarySaleHappened == true) {
          flag = 1;
          return true;
        }
      });
      if (flag == 1) return true;
    });
    if (flag == 1) return true;
    else return false;
  };

  const resaleAuctions = auctions
    .sort(
      (a, b) =>
        a.auction.info.endedAt
          ?.sub(b.auction.info.endedAt || new BN(0))
          .toNumber() || 0,
    )
    .filter(m => checkPrimarySale(m) == true);

  // Removed resales from live auctions
  const liveAuctions = auctions
    .sort(
      (a, b) =>
        a.auction.info.endedAt
          ?.sub(b.auction.info.endedAt || new BN(0))
          .toNumber() || 0,
    )
    .filter(a => !resaleAuctions.includes(a));

  let items = liveAuctions;

  switch (activeKey) {
    case LiveAuctionViewState.All:
      items = liveAuctions;
      break;
    case LiveAuctionViewState.Participated:
      items = liveAuctions
        .concat(auctionsEnded)
        .filter(
          m => m.myBidderMetadata?.info.bidderPubkey == publicKey?.toBase58(),
        );
      break;
    case LiveAuctionViewState.Resale:
      items = resaleAuctions;
      break;
    case LiveAuctionViewState.Ended:
      items = auctionsEnded;
      break;
  }

  const liveAuctionsView = (
    <MetaplexMasonry>
      {!isLoading
        ? items.map((m, idx) => {
            const id = m.auction.pubkey;
            return (
              <Link to={`/auction/${id}`} key={idx}>
                <AuctionRenderCard key={id} auctionView={m} />
              </Link>
            );
          })
        : []}
    </MetaplexMasonry>
  );
  const endedAuctions = (
    <MetaplexMasonry>
      {!isLoading
        ? auctionsEnded.map((m, idx) => {
            const id = m.auction.pubkey;
            return (
              <Link to={`/auction/${id}`} key={idx}>
                <AuctionRenderCard key={id} auctionView={m} />
              </Link>
            );
          })
        : []}
    </MetaplexMasonry>
  );

  return (
    <>
      <Banner
        src="/main-banner.svg"
        headingText="The amazing world of Metaplex."
        subHeadingText="Buy exclusive Metaplex NFTs."
        actionComponent={<HowToBuyModal />}
      />
      <Tabs
        activeKey={activeKey}
        onTabClick={key => setActiveKey(key as LiveAuctionViewState)}
      >
        <TabPane tab="Live" key={LiveAuctionViewState.All}>
          {liveAuctionsView}
        </TabPane>
        {resaleAuctions.length > 0 && (
          <TabPane
            tab="Secondary Marketplace"
            key={LiveAuctionViewState.Resale}
          >
            {liveAuctionsView}
          </TabPane>
        )}
        <TabPane tab="Ended" key={LiveAuctionViewState.Ended}>
          {endedAuctions}
        </TabPane>
        {connected && (
          <TabPane tab="Participated" key={LiveAuctionViewState.Participated}>
            {liveAuctionsView}
          </TabPane>
        )}
      </Tabs>
    </>
  );
};
