import { Metadata, ParsedAccount, shortenAddress } from '@oyster/common';
import React from 'react';

import { ArtContent } from '../../../../../../components/ArtContent';
import { useArt } from '../../../../../../hooks';
import { Tooltip } from 'antd';

interface IPropsRedeemCard {
  item: ParsedAccount<Metadata>;
  probability: string;
}

const RedeemCard = ({
  item: { info, pubkey },
  probability,
}: IPropsRedeemCard) => {
  const { creators } = useArt(pubkey);

  return (
    <div className="card-redeem">
      <div className="info">
        <div className="card-redeem__image">
          <ArtContent pubkey={pubkey} uri={info.data.uri} preview={false} />
        </div>
        <div className="info__text">
          <Tooltip title={info.data.name}>
            <p className="info__title">{info.data.name}</p>
          </Tooltip>
          <Tooltip
            title={creators?.map(
              creator =>
                ' ' + (creator.name || shortenAddress(creator.address || '')),
            )}
          >
            <p className="info__creators">
              {creators?.map(
                creator =>
                  ' ' + (creator.name || shortenAddress(creator.address || '')),
              )}
            </p>
          </Tooltip>
        </div>
      </div>
      <div className="card-redeem__percentage">
        <p className="percentage-desktop">{`${probability}% chance`}</p>
        <p className="percentage-mobile">{`${probability}%`}</p>
      </div>
    </div>
  );
};

export default RedeemCard;
