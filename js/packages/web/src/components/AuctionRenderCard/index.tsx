import { Card, CardProps, Divider, Space } from 'antd';
import React from 'react';
import { AuctionView, useArt, useCreators } from '../../hooks';
import { AmountLabel } from '../AmountLabel';
import { ArtContent } from '../ArtContent';
import { AuctionCountdown } from '../AuctionNumbers';
import { MetaAvatar } from '../MetaAvatar';
import { getHumanStatus, useAuctionStatus } from './hooks/useAuctionStatus';

export interface AuctionCard extends CardProps {
  auctionView: AuctionView;
}

export const AuctionRenderCard = (props: AuctionCard) => {
  const { auctionView } = props;
  const id = auctionView.thumbnail.metadata.pubkey;
  const art = useArt(id);
  const creators = useCreators(auctionView);
  const name = art?.title || ' ';

  const { status, amount } = useAuctionStatus(auctionView);
  const humanStatus = getHumanStatus(status);

  const card = (
    <Card hoverable bordered={false}>
      <Space direction="vertical" className="metaplex-fullwidth">
        <Space direction="horizontal">
          <MetaAvatar creators={[creators[0]]} />
          <span>
            {creators[0]?.name || creators[0]?.address?.substr(0, 6)}...
          </span>
        </Space>

        <ArtContent preview={false} pubkey={id} allowMeshRender={false} card />
        <h3>{name}</h3>

        {!status.isInstantSale && status.isLive && (
          <div>
            <h5>ENDING IN</h5>
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
