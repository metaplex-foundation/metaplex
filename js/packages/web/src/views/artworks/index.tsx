import { useWallet } from '@solana/wallet-adapter-react';
import { Tabs } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useMeta } from '../../contexts';
import { useCreatorArts, useUserArts } from '../../hooks';

const { TabPane } = Tabs;

export enum ArtworkViewState {
  Metaplex = '0',
  Owned = '1',
  Created = '2',
}

export const ArtworksView = () => {
  const { connected, publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const { metadata, isLoading } = useMeta();
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);

  const items =
    activeKey === ArtworkViewState.Owned
      ? ownedMetadata.map(m => m.metadata)
      : activeKey === ArtworkViewState.Created
      ? createdMetadata
      : metadata;

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Owned);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  const artworkGrid = (
    <MetaplexMasonry>
      {!isLoading
        ? items.map((m, idx) => {
            const id = m.pubkey;
            return (
              <Link to={`/art/${id}`} key={idx}>
                <ArtCard
                  key={id}
                  pubkey={m.pubkey}
                  preview={false}
                  height={250}
                  width={250}
                />
              </Link>
            );
          })
        : []}
    </MetaplexMasonry>
  );

  return (
    <Tabs
      activeKey={activeKey}
      onTabClick={key => setActiveKey(key as ArtworkViewState)}
    >
      <TabPane tab="All" key={ArtworkViewState.Metaplex}>
        {artworkGrid}
      </TabPane>
      {connected && (
        <TabPane tab="Owned" key={ArtworkViewState.Owned}>
          {artworkGrid}
        </TabPane>
      )}
      {connected && (
        <TabPane tab="Created" key={ArtworkViewState.Created}>
          {artworkGrid}
        </TabPane>
      )}
    </Tabs>
  );
};
