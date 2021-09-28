import { UseQueryArgs, UseQueryResponse } from 'urql';
import { useMemo } from 'react';
import { useStore } from '@oyster/common/dist/lib/contexts/index';

export type QueryResultData<QueryHook extends () => any> = NonNullable<
  ReturnType<QueryHook>[0]
>;

export type QueryResultField<
  QueryHook extends (...args: any[]) => any,
  T extends string,
> = NonNullable<QueryResultData<QueryHook>[T]>;

export function createQuery<
  TVars extends { storeId: string },
  TResult,
  TOutput = TResult,
>(
  useQueryFn: (
    opts: Omit<UseQueryArgs<TVars>, 'query'>,
  ) => UseQueryResponse<TResult>,
  postProcess?: (args: TResult) => TOutput,
) {
  return (variables?: Omit<TVars, 'storeId'>) => {
    const { storeAddress } = useStore();
    const [result, reexecuteQuery] = useQueryFn({
      variables: { storeId: storeAddress!, ...variables } as TVars,
      pause: !storeAddress,
    });

    const resultData = useMemo(() => {
      if (result.data && postProcess) {
        return postProcess(result.data);
      }
      return result.data;
    }, [result.data, postProcess]);

    // TODO: throw error if storeAddress is not configured
    return [
      resultData as TOutput | undefined,
      {
        fetching: result.fetching || !storeAddress,
        error: result.error,
      },
      reexecuteQuery,
    ] as const;
  };
}
