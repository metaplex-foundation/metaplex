import React from 'react';
import { Row, Col, Divider, Layout, Tag, Badge } from 'antd';
import { useParams } from 'react-router-dom';
import { useArt } from './../../hooks';

import './index.less';
import { ArtContent } from '../../components/ArtContent';
import { shortenAddress } from '@oyster/common';
import { MetaAvatar } from '../../components/MetaAvatar';

const { Content } = Layout;

export const ArtView = () => {
  const { id } = useParams<{ id: string }>();
  const art = useArt(id);

  return (
    <Content>
      <Col>
        <Row>
          <ArtContent category={art.category} extension={art.image} uri={art.image} className="artwork-image" />
        </Row>
        <Divider />
        <Row
          style={{ margin: '0 30px', textAlign: 'left', fontSize: '1.4rem' }}
        >
          <Col span={24}>
            {art.creators?.find(c => !c.verified) && (
              <>
                <div className="info-header">
                  <Tag color="blue">UNVERIFIED</Tag>
                </div>
                <div style={{ fontSize: 12 }}>
                  <i>
                    This artwork is still missing verification from{' '}
                    {art.creators?.filter(c => !c.verified).length} contributors
                    before it can be considered verified and sellable on the
                    platform.
                  </i>
                </div>
                <br />
              </>
            )}
            <div style={{ fontWeight: 700 }}>{art.title}</div>
            <br />
            <div className="info-header">CREATED BY</div>
            <div className="creators">
              {(art.creators || []).map(creator => {
                return (
                  <div className="info-content">
                    <MetaAvatar creators={[creator]} size={64} />
                    <span className="creator-name">{creator.name || shortenAddress(creator.address || '')}</span>
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
