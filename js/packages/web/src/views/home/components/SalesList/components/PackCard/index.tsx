import React, { useMemo, ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'antd';
import { useMeta } from '@oyster/common';

import { MetaAvatar } from '../../../../../../components/MetaAvatar';
import { CachedImageContent } from '../../../../../../components/ArtContent';
import { getCreator } from './utils';

interface Props {
  pubkey: string;
  posterUri: string;
  name: string;
  authority: string;
}

const PackCard = ({
  pubkey,
  posterUri,
  name,
  authority,
}: Props): ReactElement => {
  const { whitelistedCreatorsByCreator } = useMeta();

  const creator = useMemo(
    () => getCreator(whitelistedCreatorsByCreator, authority),
    [whitelistedCreatorsByCreator, authority],
  );

  return (
    <Link to={`/pack/${pubkey}`}>
      <Card hoverable={true} className="auction-render-card" bordered={false}>
        <div className="card-art-info">
          <div className="card-artist-info card-artist-info--pack">
            <MetaAvatar creators={[creator]} />
            <div className="card-artist-info__subtitle">
              <p>Pack</p>
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
            <span className="info-message">PACK OPENING UNLOCKS</span>
            <p className="info-message__main">Nov 9, 2021</p>
          </div>
        </div>
        <div className="card-bid-info"></div>
      </Card>
    </Link>
  );
};

export default PackCard;
