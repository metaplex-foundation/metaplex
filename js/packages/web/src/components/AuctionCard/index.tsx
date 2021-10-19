import React, { useEffect, useState } from 'react';
import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import { useAuction, useExtendedArt } from '../../hooks';
import { ArtContent } from '../ArtContent';
import { Link } from 'react-router-dom';

export const AuctionCard = props => {
  const { pubkey, auction, price } = props;
  const id = pubkeyToString(pubkey);

  const [cardObj, setCardObj] = useState<IMetadataExtension | undefined>();
  const { ref, data } = useExtendedArt(id);
  useEffect(() => {
    setCardObj(data);
  }, [data]);

  const auc = useAuction(auction);
  return (
    <div id="auction-sec" className="col-md-3 mt-4" ref={ref as any}>
      <div className="card p-3">
        <Link to={auction ? `/auction/${auction}` : '#'}>
          <ArtContent
            pubkey={pubkey}
            preview={false}
            category={cardObj?.properties.category}
            files={cardObj?.properties.files}
            animationURL={cardObj?.animation_url}
            uri={cardObj?.image}
          />
        </Link>
        {/* <div className="wish-count">
          <img src="/images/heart-icon.svg" alt="..." />
          <span>20</span>
        </div> */}
        <Link to={auction ? `/auction/${auction}` : '#'}>
          <div className="card-body">
            <div
              className="circle"
              style={{
                background:
                  auc?.state == '2' || auc?.state == '3' ? 'red' : '#0ee9a7',
              }}
            ></div>
            <h5 className="card-title m-0 text-white">{cardObj?.name}</h5>
            <p className="card-text">{cardObj?.description}</p>
            <div className="btn btn-primary">
              <img src="/images/exchange-white.png" />
              {price} SOL
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};
