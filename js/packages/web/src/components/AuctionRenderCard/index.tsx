import { Card, CardProps, Space, Divider } from 'antd';
import React from 'react';
import { AuctionView, useArt } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { ArtContent } from '../ArtContent';
import { AuctionCountdown } from '../AuctionNumbers';
import { getHumanStatus, useAuctionStatus } from './hooks/useAuctionStatus';
export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const name = art?.title || ' ';

  const { status, amount } = useAuctionStatus(auctionView);
  const humanStatus = getHumanStatus(status);

  const card = (
    <Card hoverable bordered={false} style={{ borderRadius: '5px' }}>
      <Space direction="vertical" className="metaplex-fullwidth">
        <ArtContent
          square
          backdrop="light"
          preview={false}
          pubkey={id}
          allowMeshRender={false}
        />
        <h3 style={{ margin: '1rem 0 0.5rem' }}>{name}</h3>

        {!status.isInstantSale && status.isLive && (
          <div>
            <p style={{ fontSize: '0.9rem', margin: '0.5rem 0 0.35rem' }}>
              Ending in
            </p>
            <AuctionCountdown auctionView={auctionView} labels={false} />
          </div>
        )}
      </Space>
      <Divider />
      <AmountLabel title={humanStatus} amount={amount} />
    </Card>
  );

  return card;
};
