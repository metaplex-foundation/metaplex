import React, { useMemo, ReactElement } from 'react';
import { Card } from 'antd';
import { useMeta } from '@oyster/common';

import { MetaAvatar } from '../MetaAvatar';
import { CachedImageContent } from '../ArtContent';
import { getCreator } from './utils';

interface Props {
  posterUri: string;
  name: string;
  authority: string;
  cardsRedeemed?: number;
  allowedAmountToRedeem?: number;
  artView?: boolean;
}

const PackCard = ({
  posterUri,
  name,
  authority,
  cardsRedeemed,
  allowedAmountToRedeem,
  artView,
}: Props): ReactElement => {
  const { whitelistedCreatorsByCreator } = useMeta();

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  const packStatusTitle = cardsRedeemed ? 'Opened Pack' : 'Sealed Pack';
  const headingTitle = artView ? packStatusTitle : 'Pack';

  const infoMessageTitle = artView ? 'NFTs' : 'PACK OPENING UNLOCKS';
  const openedNumber =
    cardsRedeemed && cardsRedeemed > 0
      ? `${cardsRedeemed} of ${allowedAmountToRedeem} opened`
      : `${allowedAmountToRedeem} unopened`;
  const infoMessage = artView ? openedNumber : `Nov 9, 2021`;

  return (
    <Card hoverable className="auction-render-card" bordered={false}>
      <div className="card-art-info">
        <div className="card-artist-info card-artist-info--pack">
          <MetaAvatar creators={[creator]} />
          <div className="card-artist-info__subtitle">
            <p>{headingTitle}</p>
          </div>
        </div>
        <div className="art-content-wrapper">
          {posterUri && (
            <CachedImageContent
              uri={posterUri}
              className="auction-image no-events"
              preview={false}
            />
          )}
        </div>
        <div className="art-name">{name}</div>
        <div className="art-auction-info">
          <span className="info-message">{infoMessageTitle}</span>
          <p className="info-message__main">{infoMessage}</p>
        </div>
      </div>
      {!artView && <div className="card-bid-info"></div>}
    </Card>
  );
};

export default PackCard;
