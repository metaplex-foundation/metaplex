import React, { useEffect, useState } from 'react';
import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import { useExtendedArt } from '../../hooks';
import { ArtContent } from '../ArtContent';
import { Link } from 'react-router-dom';

export const AuctionCard = props => {
  const { pubkey } = props;
  const [cardObj, getCardObj] = useState<IMetadataExtension | undefined>();
  const id = pubkeyToString(pubkey);
  const { ref, data } = useExtendedArt(id);
  useEffect(() => {
    getCardObj(data);
  }, [data]);
  return (
    <div id="auction-sec" className="col-md-4 mt-4" ref={ref as any}>
      <div className="card p-3">
        <Link to={`/art/${pubkey}`}>
          <ArtContent pubkey={pubkey} preview={false} />
        </Link>
        <div className="wish-count">
          <img src="/images/heart-icon.svg" alt="..." />
          <span>20</span>
        </div>
        <Link to={`/art/${pubkey}`}>
          <div className="card-body">
            <div className="circle"></div>
            <h5 className="card-title m-0 text-white">{cardObj?.name}</h5>
            <p className="card-text">{cardObj?.description}</p>
            <a href="#" className="btn btn-primary">
              <img src="/images/exchange-white.png" />
              25.078 NINJA
            </a>
          </div>
        </Link>
      </div>
    </div>
  );
};
