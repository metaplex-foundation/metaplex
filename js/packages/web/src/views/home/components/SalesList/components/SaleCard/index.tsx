import React, { ReactElement } from 'react';
import { Link } from 'react-router-dom';

import PackCard from '../../../../../../components/PackCard';
import { AuctionRenderCard } from '../../../../../../components/AuctionRenderCard';
import { Sale } from '../../types';
import { isAuction } from '../../utils';

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
    <Link to={`/pack/${pubkey}`}>
      <PackCard name={name} posterUri={uri} authority={authority} />
    </Link>
  );
};

export default SaleCard;
