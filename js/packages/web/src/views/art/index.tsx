import React from 'react';
import { Row, Col, Divider, Layout, Tag, Button } from 'antd';
import { useParams } from 'react-router-dom';
import { useArt } from './../../hooks';

import './index.less';
import { ArtContent } from '../../components/ArtContent';
import { shortenAddress, useConnection, useWallet } from '@oyster/common';
import { MetaAvatar } from '../../components/MetaAvatar';
import { sendSignMetadata } from '../../actions/sendSignMetadata'
import { PublicKey } from '@solana/web3.js';

const { Content } = Layout;

export const ArtView = () => {
  const { id } = useParams<{ id: string }>();
  const { wallet } = useWallet();
  const connection = useConnection();
  const art = useArt(id);

  const pubkey = wallet?.publicKey?.toBase58() || '';

  const tag = <div className="info-header">
    <Tag color="blue">UNVERIFIED</Tag>
  </div>;

  const unverified = ( <>
    {tag}
    <div style={{ fontSize: 12 }}>
      <i>
        This artwork is still missing verification from{' '}
        {art.creators?.filter(c => !c.verified).length} contributors
        before it can be considered verified and sellable on the
        platform.
      </i>
    </div>
    <br />
  </>);

  return (
    <Content>
      <Col>
        <Row>
          <ArtContent category={art.category}
            extension={art.image}
            uri={art.image}
            style={{ width: 500 }}
            className="artwork-image" />
        </Row>
        <Divider />
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={24}>
            {art.creators?.find(c => !c.verified) && (unverified)}
            <div style={{ fontWeight: 700 }}>{art.title}</div>
            <br />
            <div className="info-header">CREATED BY</div>
            <div className="creators">
              {(art.creators || []).map(creator => {
                return (
                  <div className="info-content" style={{ display: 'flex', alignItems: 'center' }}>
                    <MetaAvatar creators={[creator]} size={64} />
                    <div>
                      <span className="creator-name">{creator.name || shortenAddress(creator.address || '')}</span>
                      <div style={{ marginLeft: 10 }}>{!creator.verified && (creator.address === pubkey ?
                      <Button onClick={async () => {
                        try {
                          await sendSignMetadata(connection, wallet, new PublicKey(id));
                        } catch (e) {
                          console.error(e);
                          return false;
                        }
                        return true;
                      }}>Approve</Button> :
                      tag)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <br />
            <div className="info-header">CREATOR ROYALTIES</div>
            <div className="royalties">
              {((art.seller_fee_basis_points || 0) / 100).toFixed(2)}%
            </div>
            <br />
            <div className="info-header">ABOUT THE CREATION</div>
            <div className="info-content">{art.about}</div>
            <br />
            {/*
              TODO: add info about artist


            <div className="info-header">ABOUT THE CREATOR</div>
            <div className="info-content">{art.about}</div> */}
          </Col>
        </Row>
      </Col>
    </Content>
  );
};
