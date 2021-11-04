import moment from 'moment';
import { AuctionData } from './entities';

export interface CountdownState {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const timeToAuctionEnd = (auction: AuctionData): CountdownState => {
  const now = moment().unix();
  const ended = { days: 0, hours: 0, minutes: 0, seconds: 0 };
  let endAt = auction.endedAt?.toNumber() || 0;

  if (auction.auctionGap && auction.lastBid) {
    endAt = Math.max(
      endAt,
      auction.auctionGap.toNumber() + auction.lastBid.toNumber(),
    );
  }

  let delta = endAt - now;

  if (!endAt || delta <= 0) return ended;

  const days = Math.floor(delta / 86400);
  delta -= days * 86400;

  const hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;

  const minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  const seconds = Math.floor(delta % 60);

  return { days, hours, minutes, seconds };
};
