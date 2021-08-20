import { gql } from 'urql';
import { createQuery } from './createQuery';
import {
  ArtworkType,
  ArtworkFragment,
  processArtwork,
} from './useQueryArtwork';
import {
  CreatorType,
  CreatorFragment,
  processCreator,
} from './useQueryCreators';

interface ArtworksQuery {
  creator: CreatorType;
  artworks: ArtworkType[];
}

const creatorWithArtworksQuery = gql<
  ArtworksQuery,
  { storeId: string; creatorId: string }
>`
  query getCreatorWithArtworks($storeId: String!, $creatorId: String!) {
    creator(storeId: $storeId, creatorId: $creatorId) {
      ...CreatorFragment
    }
    artworks(filter: { storeId: $storeId, creatorId: $creatorId }) {
      ...ArtworkFragment
    }
  }
  ${CreatorFragment}
  ${ArtworkFragment}
`;

export const useQueryCreatorWithArtworks = createQuery(
  creatorWithArtworksQuery,
  ({ creator, artworks }) => ({
    creator: processCreator(creator),
    artworks: artworks.map(processArtwork),
  }),
);
