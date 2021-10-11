import React, { useEffect, useState } from 'react';
import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import { useArt, useExtendedArt } from '../../hooks';
import { ArtContent } from '../ArtContent';

export const AuctionCard = props => {
  const { pubkey } = props;

  const { title, uri } = useArt(pubkey);
  const [cardObj, getCardObj] = useState<IMetadataExtension | undefined>();
  useEffect(() => {
      fetch(`${uri}`).then((res)=>{
        return res.json()
      }).then((data)=>{
        getCardObj(data);
      })
      // const cached = localStorage.getItem(`${uri}`);
      // if(!cached){
      //   const id = pubkeyToString(pubkey);
      //   const { ref, data } = useExtendedArt(id);
      //   getCardObj(data);
      // }else{
      //   getCardObj(JSON.parse(cached))
      // }
      // console.log("valod>>>>>>>>>>>>>>>>>valod", cardObj)
  }, []);
  return (
    <div id="auction-sec" className="col-md-4 mt-4">
      <div className="card p-3">
        <ArtContent pubkey={pubkey} preview={false} />
        <div className="wish-count">
          <img src="/images/heart-icon.svg" alt="..." />
          <span>20</span>
        </div>
        <div className="card-body">
          <div className="circle"></div>
          <h5 className="card-title m-0 text-white">{title}</h5>
          <p className="card-text">{cardObj?.description}</p>
          <a href="#" className="btn btn-primary">
            <img src="/images/btn-user.png" />
            25.078 NINJA
          </a>
        </div>
      </div>
    </div>
  );
};
