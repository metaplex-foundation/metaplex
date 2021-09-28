import { useGetAuctionsQuery } from '../generated/graphql';
import { createQuery } from './createQuery';

export const useQueryAuctions = createQuery(useGetAuctionsQuery);
