import { ParsedAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';
import { shortenAddress, royalty } from '@oyster/common';
import React from 'react';
import { Skeleton, Divider } from 'antd';
import { MetaAvatar } from "../../../../components/MetaAvatar";
import { ArtContent } from "../../../../components/ArtContent";
import { ViewOn } from "../../../../components/ViewOn";
import { useArt } from "../../../../hooks";

const PackSidebar = ({ pack, id = '' }: { pack?: ParsedAccount<PackSet>, id?: string }) => {
  const art = useArt(id);
  return (
    <div className="pack-view__sidebar">
      <div className="pack-view__owner">
        <div className="item-title">Owner</div>
        {(art.creators || []).map((creator) =>
          <div key={creator.address}>
            <MetaAvatar creators={[creator]} size={32} />
            <span className="item-name">{creator.name || shortenAddress(creator?.address || '')}</span>
          </div>
        )}
      </div>
      <Divider className="divider"/>
      <div className="pack-view__art-preview">
        {
          id ? (
            <ArtContent
              pubkey={id}
              active={true}
              allowMeshRender={true}
              artView={true}
            />
          ) : (
            <Skeleton.Image />
          )
        }
      </div>
      <h4 className="pack-view__name">{pack?.info?.name || <Skeleton paragraph={{ rows: 1 }} />}</h4>
      <div className="pack-view__info">
        <div className="info-item">
          <div className="info-item__title">PACK OF</div>
          <div className="info-item__value">{pack?.info?.packCards || 0} NFTs</div>
        </div>
        <div className="info-item">
          <div className="info-item__title">Royalties</div>
          <div className="info-item__value">{royalty(art.seller_fee_basis_points)}</div>
        </div>
        <div className="info-item">
          <ViewOn id={id} />
        </div>
      </div>
      <Divider className="divider"/>
      <div className="pack-view__description-block">
        <p className="pack-view__title">DETAILS</p>
        <p className="pack-view__text">
          {pack?.info?.description || <Skeleton paragraph={{ rows: 3 }} />}
        </p>
      </div>
    </div>
  );
};

export default PackSidebar;
