import { gql } from 'urql';
import { populateArtistInfo } from '../utils/getArtistInfo';
import { createQuery, QueryResultField } from './createQuery';

export type CreatorType = {
  pubkey: string; // PublicKey
  address: string;
  activated: boolean;
};

type CreatorsQuery = {
  creators: CreatorType[];
};

export const CreatorFragment = gql`
  fragment CreatorFragment on Creator {
    address
    activated
  }
`;

const creatorsQuery = gql<CreatorsQuery, { storeId: string }>`
  query getCreastors($storeId: String!) {
    creators(storeId: $storeId) {
      ...CreatorFragment
    }
  }
  ${CreatorFragment}
`;

export const useQueryCreators = createQuery(creatorsQuery, ({ creators }) => ({
  creators: creators.map(processCreator),
}));

export const processCreator = populateArtistInfo;

export type Artist = QueryResultField<typeof useQueryCreators, 'creators'>[0];
