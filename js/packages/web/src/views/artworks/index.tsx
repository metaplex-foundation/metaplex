import { LoadingOutlined } from '@ant-design/icons';
import {
  loadMetadataForUsers,
  useConnection,
  useUserAccounts,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Col, Row, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useMeta } from '../../contexts';
import { useUserArts } from '../../hooks';

export const ArtworksView = () => {
  const ownedMetadata = useUserArts();
  const [loadingArt, setLoadingArt] = useState(true);
  const { whitelistedCreatorsByCreator, patchState } = useMeta();
  const connection = useConnection();
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  useEffect(() => {
    (async () => {
      setLoadingArt(true);
      const metadataState = await loadMetadataForUsers(
        connection,
        userAccounts,
        whitelistedCreatorsByCreator,
      );

      patchState(metadataState);
      setLoadingArt(false);
    })();
  }, [connection, wallet.connected]);

  if (loadingArt) {
    return (
      <div className="app-section--loading">
        <Spin indicator={<LoadingOutlined />} />
      </div>
    );
  }

  return (
    <>
      <Row justify="space-between" align="middle">
        <h2>Owned Artwork</h2>
        <Link to="/listings/new/0">
          <Button size="large" type="primary">Sell NFT</Button>
        </Link>
      </Row>
      <Row>
        <Col span={24}>
          <MetaplexMasonry>
            {ownedMetadata.map(m => {
              const id = m.metadata.pubkey;
              const creators = m.metadata.info.data.creators;
              let address: string = '';

              if (creators) {
                address = creators[0].address;
              }
              return (
                <Link to={`/creators/${address}/nfts/${id}`} key={id}>
                  <ArtCard
                    key={id}
                    pubkey={m.metadata.pubkey}
                    preview={false}
                  />
                </Link>
              );
            })}
          </MetaplexMasonry>
        </Col>
      </Row>
    </>
  );
};
