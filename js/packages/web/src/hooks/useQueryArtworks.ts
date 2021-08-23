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
  {
    storeId: string;
    creatorId?: string;
    ownerId?: string;
    onlyVerified?: boolean;
  }
>`
  query getArtworks(
    $storeId: String!
    $creatorId: String
    $ownerId: String
    $onlyVerified: Boolean
  ) {
    artworks(
      filter: {
        storeId: $storeId
        creatorId: $creatorId
        ownerId: $ownerId
        onlyVerified: $onlyVerified
      }
    ) {
      ...ArtworkFragment
    }
  }
  ${ArtworkFragment}
`;

export const useQueryArtworks = createQuery(artworksQuery, ({ artworks }) => ({
  artworks: artworks.map(processArtwork),
}));
