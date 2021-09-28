import { populateArtistInfo } from './getArtistInfo';
import { createQuery } from './createQuery';
import { Artwork, useGetArtworksByIdQuery } from '../generated/graphql';

export const useQueryArtwork = createQuery(
  useGetArtworksByIdQuery,
  ({ artwork }) => ({
    artwork: artwork ? processArtwork(artwork) : null,
  }),
);

export const processArtwork = (art: Artwork) => ({
  ...art,
  creators: art.creators
    ?.filter(Boolean)
    .map(populateArtistInfo)
    .sort(sortCreators),
});

const sortCreators = <T extends { share?: number; name?: string }>(
  a: T,
  b: T,
) => {
  return (
    (b.share ?? 0) - (a.share ?? 0) ||
    (a.name || '').localeCompare(b.name || '')
  );
};
