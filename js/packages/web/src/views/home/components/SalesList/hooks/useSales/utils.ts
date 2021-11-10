import { BN } from 'bn.js';

import { isAuction } from '../../utils';
import { Sale } from '../../types';

export const sortSalesByDate = (auctions: Array<Sale>): Array<Sale> =>
  auctions.sort((a, b) => {
    const aEndTime = isAuction(a)
      ? a.auction.info.endedAt
      : a.info.redeemEndDate;
    const bEndTime = isAuction(b)
      ? b.auction.info.endedAt
      : b.info.redeemEndDate;

    return aEndTime?.sub(bEndTime || new BN(0)).toNumber() || 0;
  });
