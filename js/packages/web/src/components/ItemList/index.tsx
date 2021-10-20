import { IMetadataExtension, pubkeyToString } from '@oyster/common';
import React, { useEffect, useState } from 'react';
import { useExtendedArt } from '../../hooks';


export const ItemList = props => {
  const { pubkey } = props;
  const [cardObj, getCardObj] = useState<IMetadataExtension | undefined>();
  const id = pubkeyToString(pubkey)
  const { data } = useExtendedArt(id);
  useEffect(()=>{
    getCardObj(data)
  }, [data])
  return (
    <div id="itemlist-sec" className="mt-4">
      <div className="card-sec d-flex justify-content-between align-items-center mb-3">
        <div className="media d-flex align-items-center">
          <img
            src={cardObj?.image}
            className="mr-3 itemlist"
            alt="..."
          />
          <div className="media-body">
            <h5 className="card-title mb-1">{cardObj?.name}</h5>
            <p className="card-text m-0">{cardObj?.description}</p>
          </div>
        </div>
        <a href="#" className="btn btn-primary price d-flex align-items-center">
          <img src="/images/exchange-white.png" className="mr-1" /> 25.078
        </a>
      </div>
    </div>
  );
};
