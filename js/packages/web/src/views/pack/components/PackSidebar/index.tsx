import { shortenAddress, royalty, pubkeyToString } from '@oyster/common';
import React from 'react';
import { Skeleton, Divider } from 'antd';

import { MetaAvatar } from '../../../../components/MetaAvatar';
import { ArtContent } from '../../../../components/ArtContent';
import { ViewOn } from '../../../../components/ViewOn';
import { useArt } from '../../../../hooks';
import { usePack } from '../../contexts/PackContext';
import { useWallet } from '@solana/wallet-adapter-react';
import OpenPackButton from '../OpenPackButtom';

interface IPropsPackSidebar {
  onOpenPack: () => void,
}

const PackSidebar = ({ onOpenPack }: IPropsPackSidebar) => {
  const { pack, voucherMetadataKey, provingProcess } = usePack();

  const metadataPubkey = voucherMetadataKey || '';
  const art = useArt(metadataPubkey);
  const { publicKey } = useWallet();
  const userWallet = pubkeyToString(publicKey);
  const isExhausted = provingProcess?.info.isExhausted;

  return (
    <div className="pack-view__sidebar">
      <div className="pack-view__owner">
        <div className="item-title">Owner</div>
        {(art.creators || []).map(creator => (
          <div key={creator.address}>
            <MetaAvatar creators={[creator]} size={32} />
            <span className="item-name">
              {creator.name || shortenAddress(creator?.address || '')}
            </span>
            {
              userWallet === creator.address &&
              <div className="you-label">
                You
              </div>
            }
          </div>
        ))}
      </div>
      <Divider className="divider" />
      <div className="pack-view__art-preview">
        {metadataPubkey && (
          <ArtContent pubkey={metadataPubkey} active allowMeshRender artView />
        )}
        {!metadataPubkey && <Skeleton.Image />}
      </div>
      <h4 className="pack-view__name">
        {pack?.info?.name || <Skeleton paragraph={{ rows: 1 }} />}
      </h4>
      <div className="pack-view__info">
        <div className="info-item">
          <div className="info-item__title">PACK OF</div>
          <div className="info-item__value">
            {pack?.info?.packCards || 0} NFTs
          </div>
        </div>
        <div className="info-item">
          <div className="info-item__title">Royalties</div>
          <div className="info-item__value">
            {royalty(art.seller_fee_basis_points)}
          </div>
        </div>
        <div className="info-item">
          <ViewOn id={metadataPubkey} />
        </div>
      </div>
      <Divider className="divider" />
      {
        !isExhausted && <OpenPackButton onClick={onOpenPack} />
      }
      <Divider className="divider"/>
      <div className="pack-view__description-block">
        <p className="pack-view__title">DETAILS</p>
        <p className="pack-view__text">
          {pack?.info?.description || <Skeleton paragraph={{ rows: 3 }} />}
        </p>
      </div>
      <div className="pack-view__info-mobile">
        <div className="info-item">
          <ViewOn id={metadataPubkey} />
        </div>
        <Divider className="divider"/>
      </div>
    </div>
  );
};

export default PackSidebar;
