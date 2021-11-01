import React, { useEffect, useState } from 'react';
import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import { Link } from 'react-router-dom';
import { useAuction, useExtendedArt } from '../../hooks';

export const AuctionCard = props => {
  const { auction, keys } = props;
  const price = auction.account.price

  const [loadImage, setLoadImage] = useState(false);

  return (
    <div id="auction-sec" className="col-md-6 col-lg-3 col-sm-6 mt-4" key={keys}>
      <Link to={auction.info.auction ? `/auction/${auction.info.auction}` : '#'}>
        <div className="card p-3 ">
          <div className="nft-img">
            <img
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '5px',
                display: loadImage ? 'block' : 'none',
                objectFit: 'cover',
              }}
              src={auction.account?.image}
              loading="eager"
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
                  auction.account?.state == '2' || auction.account?.state == '3' ? 'red' : '#0ee9a7',
              }}
            ></div>
            <h5 className="card-title m-0 text-white">{auction.account?.name}</h5>
            <p className="card-text">{auction.account?.description}</p>
            <div className="btn btn-primary ">
              <img src="/images/Vector.svg" style={{ backgroundColor: "blue", borderRadius: "50%", }} />
              {price} Ninjia
            </div>
          </div>
        </div >
      </Link >
    </div >
  );
};
