import {
  loadArtwork,
  shortenAddress,
  useConnection,
  useMeta,
  loadMultipleAccounts,
  ENDPOINTS,
  useLocalStorageState,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, List, Skeleton, Tag, Space } from 'antd';
import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useParams } from 'react-router-dom';
import { sendSignMetadata } from '../../actions/sendSignMetadata';
import { ArtContent } from '../../components/ArtContent';
import { ArtMinting } from '../../components/ArtMinting';
import { ViewOn } from '../../components/ViewOn';
import { useArt, useExtendedArt } from '../../hooks';
import { ArtType } from '../../types';
import { holaSignMetadata } from '../../components/MintModal/sign-meta';

const META_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

enum SigningStatus {
  NOT_DONE,
  PENDING,
  DONE,
}

export const ArtView = () => {
  const { nft } = useParams<{ nft: string }>();
  const wallet = useWallet();
  const { patchState, whitelistedCreatorsByCreator } = useMeta();
  const [remountArtMinting, setRemountArtMinting] = useState(0);
  const [validating, setValidating] = useState(false);
  const { metadataByMetadata } = useMeta();
  const metaDataKey = metadataByMetadata[nft as string];
  const [signingStatus, setSigningStatus] = useState<SigningStatus>(
    SigningStatus.NOT_DONE,
  );
  const signingStatusCopy =
    signingStatus === SigningStatus.PENDING ? 'Attempting...' : 'Retry Signing';

  const connection = useConnection();
  const art = useArt(nft);
  const isUnverified = !!art.creators?.find(c => !c.verified);

  const [solanaEndpoint] = useLocalStorageState(
    'connectionEndpoint',
    ENDPOINTS[0].endpoint,
  );

  const retrySigning: React.MouseEventHandler<HTMLElement> = async e => {
    e.preventDefault();
    const metaProgramId = new PublicKey(META_PROGRAM_ID);
    const metadata = new PublicKey(metaDataKey.pubkey);
    await holaSignMetadata({
      solanaEndpoint,
      metadata,
      metaProgramId,
      onComplete: () => {
        setSigningStatus(SigningStatus.DONE);
        console.log('sign completed');
      },
      onProgress: status => {
        setSigningStatus(SigningStatus.PENDING);
        console.log('sign progress', status);
      },
      onError: (msg: string) => {
        setSigningStatus(SigningStatus.NOT_DONE);
        throw new Error(msg);
      },
    });
  };

  let badge = '';
  let maxSupply = '';
  if (art.type === ArtType.NFT) {
    badge = 'Unique';
  } else if (art.type === ArtType.Master) {
    badge = 'NFT 0';
    if (art.maxSupply !== undefined) {
      maxSupply = art.maxSupply.toString();
    } else {
      maxSupply = 'Unlimited';
    }
  } else if (art.type === ArtType.Print) {
    badge = `${art.edition} of ${art.supply}`;
  }
  const { ref, data } = useExtendedArt(nft);

  useEffect(() => {
    (async () => {
      if (!nft) {
        return;
      }

      const artState = await loadArtwork(
        connection,
        whitelistedCreatorsByCreator,
        nft,
      );

      patchState(artState);
    })();
  }, [connection]);

  const description = data?.description;
  const attributes = data?.attributes;

  const pubkey = wallet?.publicKey?.toBase58() || '';

  const tag = (
    <div>
      <Tag color="blue">UNVERIFIED</Tag>
    </div>
  );

  const unverified = (
    <>
      {tag}
      <div>
        <i>
          This artwork is still missing verification from{' '}
          {art.creators?.filter(c => !c.verified).length} contributors before it
          can be considered verified and sellable on the platform.
        </i>
      </div>
      <br />
    </>
  );

  const getArt = (className: string) => (
    <div className={className + ' metaplex-margin-bottom-8'}>
      <ArtContent
        pubkey={nft}
        active={true}
        allowMeshRender={true}
        artView={true}
        backdrop="dark"
        square={false}
      />
    </div>
  );

  const retrySignAction = (
    <>
      {signingStatus === SigningStatus.DONE ? (
        <p>Signing submitted. Please check back in a few minutes</p>
      ) : (
        <Button
          onClick={retrySigning}
          disabled={signingStatus !== SigningStatus.NOT_DONE}
        >
          {signingStatusCopy}
        </Button>
      )}
    </>
  );

  const getDescriptionAndAttributes = (className: string) => (
    <div className={className}>
      {description && (
        <>
          <h3 className="info-header">Description</h3>
          <p>{description}</p>
        </>
      )}

      {attributes && (
        <div>
          <h3 className="info-header">Attributes</h3>
          <List grid={{ column: 4 }}>
            {attributes.map((attribute, index) => (
              <List.Item key={`${attribute.value}-${index}`}>
                <List.Item.Meta
                  title={attribute.trait_type}
                  description={attribute.value}
                />
              </List.Item>
            ))}
          </List>
        </div>
      )}
    </div>
  );

  return (
    <div className="item-page-wrapper" ref={ref}>
      <div className="item-page-left">
        {getArt('art-desktop')}
        {isUnverified && unverified}
        {getDescriptionAndAttributes('art-desktop')}
      </div>
      <div className="item-page-right">
        <div className="title-row">
          <h1>{art.title || <Skeleton paragraph={{ rows: 0 }} />}</h1>
          <ViewOn id={nft} />
        </div>

        {getArt('art-mobile')}
        {isUnverified && unverified}
        {getDescriptionAndAttributes('art-mobile')}

        <div className="info-outer-wrapper">
          <div className="info-items-wrapper">
            <div className="info-item-wrapper">
              <span className="item-title">Royalties</span>
              {((art.seller_fee_basis_points || 0) / 100).toFixed(2)}%
            </div>

            <div className="info-item-wrapper">
              <span className="item-title">
                {art?.creators?.length || 0 > 1 ? 'Creators' : 'Creator'}
              </span>
              {(art.creators || []).map(creator => {
                return (
                  <>
                    {creator.name || shortenAddress(creator.address || '')}

                    <div>
                      {!creator.verified &&
                        (creator.address === pubkey ? (
                          <Button
                            loading={validating}
                            onClick={async () => {
                              setValidating(true);

                              if (!nft) {
                                return;
                              }

                              try {
                                const res = await sendSignMetadata(
                                  connection,
                                  wallet,
                                  nft,
                                );

                                if (res.err) throw res.err.inner;

                                const { txid } = res;
                                const tx = await connection.getTransaction(
                                  txid,
                                  {
                                    commitment: 'confirmed',
                                  },
                                );

                                const keys =
                                  tx?.transaction.message.accountKeys || [];

                                const patch = await loadMultipleAccounts(
                                  connection,
                                  keys.map(k => k.toBase58()),
                                  'confirmed',
                                );

                                patchState(patch);
                              } catch (e) {
                                console.error(e);
                                return false;
                              } finally {
                                setValidating(false);
                              }
                              return true;
                            }}
                          >
                            Approve
                          </Button>
                        ) : (
                          tag
                        ))}
                    </div>
                  </>
                );
              })}
            </div>

            <div className="info-item-wrapper">
              <span className="item-title">Edition</span>
              {badge}
            </div>

            {art.type === ArtType.Master && (
              <div className="info-item-wrapper">
                <span className="item-title">Max Supply</span>
                {maxSupply}
              </div>
            )}
          </div>
        </div>

        <Space>
          <ArtMinting
            id={nft}
            key={remountArtMinting}
            onMint={async () => await setRemountArtMinting(prev => prev + 1)}
          />
          {isUnverified && retrySignAction}
        </Space>
      </div>
    </div>
  );
};
