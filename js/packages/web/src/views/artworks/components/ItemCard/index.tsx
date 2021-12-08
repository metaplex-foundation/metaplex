import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { ArtCard } from '../../../../components/ArtCard';
import PackCard from '../../../../components/PackCard';
import { Item } from '../../types';
import { isPack } from '../../utils';

const ART_CARD_SIZE = 250;

const ItemCard = ({ item }: { item: Item }): ReactElement => {
  if (isPack(item)) {
    const {
      pubkey,
      cardsRedeemed,
      edition,
      info: { authority, allowedAmountToRedeem },
      provingProcessKey,
      voucherMetadataKey,
    } = item;

    const search = edition
      ? `voucherEditionKey=${edition}`
      : `provingProcessKey=${provingProcessKey}`;

    return (
      <Link to={`/pack/${pubkey}?${search}`}>
        <PackCard
          name={item.info.name}
          voucherMetadata={voucherMetadataKey || ''}
          authority={authority}
          cardsRedeemed={cardsRedeemed}
          allowedAmountToRedeem={allowedAmountToRedeem}
          artView
        />
      </Link>
    );
  }

  const { pubkey } = item;

  return (
    <Link to={`/art/${pubkey}`}>
      <ArtCard
        key={pubkey}
        pubkey={pubkey}
        preview={false}
        height={ART_CARD_SIZE}
        width={ART_CARD_SIZE}
        artView
      />
    </Link>
  );
};

export default ItemCard;
