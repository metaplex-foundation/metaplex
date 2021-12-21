import React, { ReactElement, useMemo } from 'react';
import { Button, Card } from 'antd';
import { shortenAddress, useMeta } from '@oyster/common';

import { MetaAvatar } from '../MetaAvatar';
import { ArtContent } from '../ArtContent';
import { getCreator } from './utils';
import { useArt } from '../../hooks';
import { ArtType } from '../../types';

interface Props {
  voucherMetadata: string;
  uri: string;
  name: string;
  authority: string;
  cardsRedeemed?: number;
  allowedAmountToRedeem?: number;
  artView?: boolean;
  onClose?: () => void;
}

const PackCard = ({
  voucherMetadata,
  uri,
  name,
  authority,
  cardsRedeemed,
  allowedAmountToRedeem,
  artView,
  onClose,
}: Props): ReactElement => {
  const { whitelistedCreatorsByCreator } = useMeta();
  const art = useArt(voucherMetadata);

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  const packStatusTitle = cardsRedeemed ? 'Opened' : 'Sealed';
  const headingTitle = artView ? packStatusTitle : 'Pack';
  const badge = art.type === ArtType.Print && `${art.edition} of ${art.supply}`;
  const numberOfCardsLeft =
    allowedAmountToRedeem && cardsRedeemed
      ? allowedAmountToRedeem - cardsRedeemed
      : allowedAmountToRedeem || 0;

  const infoMessage = useMemo(() => {
    if (!artView) return 'PACK OPENING UNLOCKS';
    return numberOfCardsLeft
      ? `${numberOfCardsLeft} NFT reveal left`
      : 'All revealed';
  }, [artView, numberOfCardsLeft]);

  return (
    <Card hoverable className="auction-render-card" bordered={false}>
      {onClose && (
        <Button
          className="card-close-button"
          shape="circle"
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
        >
          X
        </Button>
      )}
      <div className="card-art-info">
        <div className="pack-gray-wrapper">
          <div className="card-artist-info card-artist-info--pack">
            <div className="pack-creator-info">
              <MetaAvatar creators={[creator]} />
              <span className="pack-creator-name">
                {creator.name || shortenAddress(creator?.address || '')}
              </span>
            </div>
            {badge && (
              <div className="card-artist-info__subtitle">
                <p className="info-message__main">{badge}</p>
              </div>
            )}
          </div>
          <div className="art-content-wrapper">
            <ArtContent uri={uri} preview={false} />
          </div>
          <div className="art-name">{name}</div>
        </div>
        <div className="art-auction-info">
          <div className="art-auction-info__left-side">
            <img src="/grid-4.svg" />
            <span className="info-message">{infoMessage}</span>
          </div>
          <div className="art-auction-info__right-side">
            <span>{headingTitle}</span>
          </div>
        </div>
      </div>
      {!artView && <div className="card-bid-info" />}
    </Card>
  );
};

export default PackCard;
