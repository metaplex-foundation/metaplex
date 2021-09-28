import { useGetCreatorWithArtworksQuery } from '../generated/graphql';
import { createQuery } from './createQuery';
import { processArtwork } from './useQueryArtwork';
import { processCreator } from './useQueryCreators';

export const useQueryCreatorWithArtworks = createQuery(
  useGetCreatorWithArtworksQuery,
  ({ creator, artworks }) => ({
    creator: creator ? processCreator(creator) : null,
    artworks: artworks?.map(processArtwork),
  }),
);
