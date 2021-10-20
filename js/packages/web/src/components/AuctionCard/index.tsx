import React, { useEffect, useState } from 'react';
import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import { useAuction, useExtendedArt } from '../../hooks';
import { Link } from 'react-router-dom';
export const AuctionCard = props => {
  const { pubkey, auction, price } = props;
  const id = pubkeyToString(pubkey);

  const [loadImage, setLoadImage] = useState(false);
  const [cardObj, setCardObj] = useState<IMetadataExtension | undefined>();
  const { data } = useExtendedArt(id);
  useEffect(() => {
    setCardObj(data);
  }, [data]);
  const auc = useAuction(auction);
  return (
    <div id="auction-sec" className="col-md-3 mt-4">
      <Link to={auction ? `/auction/${auction}` : '#'}>
        <div className="card p-3" style={{ height: '100%' }}>
          <div style={{ width: '100%', height: '59%' }}>
            <img
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '5px',
                display: loadImage ? 'block' : 'none',
                objectFit: 'cover'
              }}
              src={cardObj?.image}
              onLoad={() => {
                setLoadImage(true);
              }}
            />
            <img
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '5px',
                display: loadImage ? 'none' : 'block',
              }}
              src="/images/blackBackground.jpg"
            />
          </div>
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
        </div>
      </Link>
    </div>
  );
};
