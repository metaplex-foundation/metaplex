import { useGetCreatorsQuery } from '../generated/graphql';
import { populateArtistInfo } from './getArtistInfo';
import { createQuery } from './createQuery';

export const useQueryCreators = createQuery(
  useGetCreatorsQuery,
  ({ creators }) => ({
    creators: creators?.map(processCreator),
  }),
);

export const processCreator = populateArtistInfo;
