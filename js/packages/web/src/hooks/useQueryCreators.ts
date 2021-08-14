import { useQuery } from 'urql';
import { useStore } from '@oyster/common/dist/lib/contexts/index';
import { useEffect } from 'react';

const CreatorsQuery = `
  query getCreators($storeId: String!) {
    creatorsByStore(storeId: $storeId) {
      address
      activated
    }
  }
`;

export const useQueryCreators = () => {
  const store = useStore();

  const [result, reexecuteQuery] = useQuery({
    query: CreatorsQuery,
    variables: { storeId: store.address?.toBase58() },
    pause: store.loading,
  });

  useEffect(() => {
    if (store.address && !result.fetching && !result.data) {
      reexecuteQuery();
    }
  }, [store.address]);

  return [
    {
      data: result.data?.creatorsByStore,
      fetching: result.fetching || store.loading,
      error: result.error,
    },
    reexecuteQuery,
  ] as const;
};
