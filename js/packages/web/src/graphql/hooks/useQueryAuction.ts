import { useGetAuctionByIdQuery } from '../generated/graphql';
import { createQuery } from './createQuery';

export const useQueryAuction = createQuery(useGetAuctionByIdQuery);
