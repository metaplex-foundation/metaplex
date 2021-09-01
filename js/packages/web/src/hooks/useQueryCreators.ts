import { useGetCreatorsQuery } from '../graphql';
import { populateArtistInfo } from '../utils/getArtistInfo';
import { createQuery, QueryResultField } from './createQuery';

export const processCreator = populateArtistInfo;

export const useQueryCreators = createQuery(
  useGetCreatorsQuery,
  ({ creators }) => ({
    creators:
      creators?.map(c => (c ? processCreator(c) : undefined)!).filter(p => p) ??
      [],
  }),
);
export type Artist = QueryResultField<typeof useQueryCreators, 'creators'>[0];
