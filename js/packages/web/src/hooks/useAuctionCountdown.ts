import { useEffect, useState } from 'react';
import { CountdownState } from '@oyster/common';
import { AuctionView } from './useAuctions';

export const useAuctionCountdown = (auctionView: AuctionView) => {
  const [state, setState] = useState<CountdownState>();

  const auction = auctionView.auction.info;

  useEffect(() => {
    const calc = () => {
      const newState = auction.timeToEnd();

      setState(newState);
    };

    const interval = setInterval(() => {
      calc();
    }, 1000);

    calc();
    return () => clearInterval(interval);
  }, [auction]);

  return state;
};
