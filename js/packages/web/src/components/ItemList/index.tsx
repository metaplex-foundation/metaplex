import { IMetadataExtension } from '@oyster/common';
import React, { useEffect, useState } from 'react';
import { useArt, useExtendedArt } from '../../hooks/useArt';


export const ItemList = props => {
  const { pubkey } = props;
  const { title, uri } = useArt(pubkey);
  const [cardObj, getCardObj] = useState<IMetadataExtension | undefined>();
  useEffect(() => {
    fetch(`${uri}`).then((res)=>{
      console.log(uri)
      return res.json()
    }).then((data)=>{
      getCardObj(data)
    })
  }, []);

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
            <h5 className="card-title mb-1">{title}</h5>
            <p className="card-text m-0">{cardObj?.description}</p>
          </div>
        </div>
        <a href="#" className="btn btn-primary price d-flex align-items-center">
          <img src="/images/btn-user.png" className="mr-1" /> 25.078
        </a>
      </div>
    </div>
  );
};
