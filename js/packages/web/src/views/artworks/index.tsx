import { InfoCircleFilled, LoadingOutlined } from '@ant-design/icons';
import {
  loadMetadataForUsers,
  useConnection,
  useConnectionConfig,
  useUserAccounts,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, Col, Row, Spin, Card, Tooltip } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArtCard } from '../../components/ArtCard';
import { MetaplexMasonry } from '../../components/MetaplexMasonry';
import { useMeta } from '../../contexts';
import { useUserArts } from '../../hooks';
import MintModal from '../../components/MintModal';

export const ArtworksView = () => {
  const ownedMetadata = useUserArts();
  const [loadingArt, setLoadingArt] = useState(true);
  const { whitelistedCreatorsByCreator, patchState, store } = useMeta();
  const connection = useConnection();
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();
  const { endpoint } = useConnectionConfig();

  const [showMintModal, setShowMintModal] = useState<boolean>(false);

  const pubkey = wallet.publicKey?.toBase58() || '';

  const canCreate = useMemo(() => {
    return (
      store?.info?.public ||
      whitelistedCreatorsByCreator[pubkey]?.info?.activated
    );
  }, [pubkey, whitelistedCreatorsByCreator, store]);

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
      <div className="metaplex-flex metaplex-align-items-center metaplex-justify-content-sb metaplex-margin-bottom-8 metaplex-gap-4 metaplex-flex-wrap">
        <div className="flex items-center">
          <h2>Owned Artwork</h2>
          <Tooltip
            title="NFTs minted with the same wallet that created this store shows up here, or ones you have bought from the store with your connected wallet."
            className="ml-2"
          >
            <InfoCircleFilled size={12} />
          </Tooltip>
        </div>
        <div>
          {canCreate && (
            <Button
              size="large"
              type={ownedMetadata.length ? 'ghost' : 'primary'}
              onClick={() => setShowMintModal(true)}
              className=""
            >
              Mint NFTs
            </Button>
          )}

          {ownedMetadata.length ? (
            <Link to="/listings/new/0" className="ml-4">
              <Button size="large" type="primary">
                Sell NFT
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
      <Row>
        <Col span={24}>
          {ownedMetadata.length ? (
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
                      solanaEndpoint={endpoint}
                      allowRetrySigning={true}
                    />
                  </Link>
                );
              })}
            </MetaplexMasonry>
          ) : (
            <Card>
              <div className="text-center text-color-text">
                <h3 className="mt-2 text-2xl font-medium ">No NFTs detected</h3>
                <p className="mt-1 text-sm opacity-75">
                  NFTs created with the same wallet that created this store will
                  show up here, as well as any bought from the store.
                </p>
                {canCreate && (
                  <>
                    <p className="mt-1 text-sm opacity-75">
                      Get started by minting some NFTs.
                    </p>
                    <div className="mt-6">
                      <Button
                        size="large"
                        type="primary"
                        onClick={() => setShowMintModal(true)}
                      >
                        Mint NFTs
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </Col>
      </Row>
      <MintModal show={showMintModal} onClose={() => setShowMintModal(false)} />
    </>
  );
};
