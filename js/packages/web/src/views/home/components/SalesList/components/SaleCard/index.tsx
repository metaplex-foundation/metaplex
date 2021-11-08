import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import { AuctionRenderCard } from '../../../../../../components/AuctionRenderCard';
import { Sale } from '../../types';
import { isAuction } from '../../utils';
import PackCard from '../PackCard';

const SaleCard = ({ sale }: { sale: Sale }): ReactElement => {
  if (isAuction(sale)) {
    const { pubkey } = sale.auction;

    return (
      <Link to={`/auction/${pubkey}`}>
        <AuctionRenderCard key={pubkey} auctionView={sale} />
      </Link>
    );
  }

  const {
    pubkey,
    info: { uri, name, authority },
  } = sale;

  return (
    <PackCard
      pubkey={pubkey}
      name={name}
      posterUri={uri}
      authority={authority}
    />
  );
};

export default SaleCard;
