import {
  loadArtwork,
  shortenAddress,
  useConnection,
  useMeta,
  loadMultipleAccounts,
} from '@oyster/common';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button, List, Skeleton, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sendSignMetadata } from '../../actions/sendSignMetadata';
import { ArtContent } from '../../components/ArtContent';
import { ArtMinting } from '../../components/ArtMinting';
import { ViewOn } from '../../components/ViewOn';
import { useArt, useExtendedArt } from '../../hooks';
import { ArtType } from '../../types';

const { Text } = Typography;

export const ArtView = () => {
  const { nft } = useParams<{ nft: string }>();
  const wallet = useWallet();
  const { patchState, whitelistedCreatorsByCreator } = useMeta();
  const [remountArtMinting, setRemountArtMinting] = useState(0);
  const [validating, setValidating] = useState(false);

  const connection = useConnection();
  const art = useArt(nft);

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
  const { data } = useExtendedArt(nft);

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
    <div className={className}>
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

  return (
    <div className="item-page-wrapper">
      <div className="item-page-left">
        {getArt('art-desktop')}
        {art.creators?.find(c => !c.verified) && unverified}
        <p style={{ padding: '1rem 8px' }} className="art-desktop">
          {description}
        </p>
        {attributes && (
          <div>
            <Text>Attributes</Text>
            <List grid={{ column: 4 }}>
              {attributes.map((attribute, i) => {
                return (
                  <List.Item key={i}>
                    <List.Item.Meta
                      title={attribute.trait_type}
                      description={attribute.value}
                    />
                  </List.Item>
                );
              })}
            </List>
          </div>
        )}
      </div>
      <div className="item-page-right">
        <div className="title-row">
          <h1>{art.title || <Skeleton paragraph={{ rows: 0 }} />}</h1>
          <ViewOn id={nft} />
        </div>

        {getArt('art-mobile')}

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
                                const txid = await sendSignMetadata(
                                  connection,
                                  wallet,
                                  nft,
                                );

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
        {/* <Button
                  onClick={async () => {
                    if(!art.mint) {
                      return;
                    }
                    const mint = new PublicKey(art.mint);
                    
                    const account = accountByMint.get(art.mint);
                    if(!account) {
                      return;
                    }
                    
                    const owner = wallet.publicKey;
                    
                    if(!owner) {
                      return;
                    }
                    const instructions: any[] = [];
                    await updateMetadata(undefined, undefined, true, mint, owner, instructions)
                    
                    sendTransaction(connection, wallet, instructions, [], true);
                  }}
                  >
                  Mark as Sold
                </Button> */}

        {/* TODO: Add conversion of MasterEditionV1 to MasterEditionV2 */}
        <ArtMinting
          id={nft}
          key={remountArtMinting}
          onMint={async () => await setRemountArtMinting(prev => prev + 1)}
        />
      </div>
    </div>
  );
};
