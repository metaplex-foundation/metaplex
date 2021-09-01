import { populateArtistInfo } from '../utils/getArtistInfo';
import { createQuery } from './createQuery';
import { Artwork, useGetArtworksByIdQuery } from '../../src/graphql';

export const processArtwork = (art: Artwork) => ({
  ...art,
  creators: art.creators
    ?.map(p => (p ? populateArtistInfo(p) : undefined))
    .filter(p => p)
    .sort((a, b) => sortCreators(a!, b!)),
});

export const useQueryArtwork = createQuery(
  useGetArtworksByIdQuery,
  ({ artwork }) =>
    artwork
      ? {
          artwork: processArtwork(artwork),
        }
      : null,
);

const sortCreators = <T extends { share?: number; name?: string }>(
  a: T,
  b: T,
) => {
  return (
    (b.share ?? 0) - (a.share ?? 0) ||
    (a.name || '').localeCompare(b.name || '')
  );
};
