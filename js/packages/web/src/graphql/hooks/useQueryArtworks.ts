import { useGetArtworksQuery } from '../generated/graphql';
import { createQuery } from './createQuery';
import { processArtwork } from './useQueryArtwork';

export const useQueryArtworks = createQuery(
  useGetArtworksQuery,
  ({ artworks }) => ({
    artworks: artworks?.map(artwork =>
      artwork ? processArtwork(artwork) : undefined,
    ),
  }),
);
