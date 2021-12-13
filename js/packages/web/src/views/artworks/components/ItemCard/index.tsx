import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { ArtCard } from '../../../../components/ArtCard';
import PackCard from '../../../../components/PackCard';
import { Item } from '../../types';
import { isMetadata, isPack } from '../../utils';

const ART_CARD_SIZE = 250;

const ItemCard = ({ item }: { item: Item }): ReactElement => {
  if (isPack(item)) {
    const {
      pubkey,
      cardsRedeemed,
      mint,
      info: { authority, allowedAmountToRedeem, uri },
      provingProcessKey,
      voucherMetadataKey,
    } = item;

    const search = mint
      ? `voucherMint=${mint}`
      : `provingProcessKey=${provingProcessKey}`;

    return (
      <Link to={`/pack/${pubkey}?${search}`}>
        <PackCard
          name={item.info.name}
          voucherMetadata={voucherMetadataKey}
          authority={authority}
          cardsRedeemed={cardsRedeemed}
          allowedAmountToRedeem={allowedAmountToRedeem}
          uri={uri}
          artView
        />
      </Link>
    );
  }

  const pubkey = isMetadata(item) ? item.pubkey : item.metadata.pubkey;

  return (
    <Link to={`/art/${pubkey}`}>
      <ArtCard
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
