import { gql } from 'urql';
import { createQuery } from './createQuery';
import {
  ArtworkFragment,
  ArtworkType,
  processArtwork,
} from './useQueryArtwork';

interface ArtworksQuery {
  artworks: ArtworkType[];
}

const artworksQuery = gql<
  ArtworksQuery,
  { storeId: string; creatorId: string }
>`
  query getArtworks($storeId: String!) {
    artworks(filter: { storeId: $storeId }) {
      ...ArtworkFragment
    }
  }
  ${ArtworkFragment}
`;

export const useQueryArtworks = createQuery(artworksQuery, ({ artworks }) => ({
  artworks: artworks.map(processArtwork),
}));
