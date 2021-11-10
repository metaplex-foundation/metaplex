import { AuctionView } from '../../../../hooks';
import { Sale } from './types';

export const isAuction = (sale: Sale): sale is AuctionView =>
  (sale as AuctionView).auction !== undefined;
