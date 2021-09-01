import {
  TypedDocumentNode,
  CombinedError,
  OperationContext,
  UseQueryArgs,
  UseQueryResponse,
} from 'urql';
import { useMemo } from 'react';
import { useStore } from '@oyster/common/dist/lib/contexts/index';
import { typeCast } from '../utils/types';

type Query<Data = any, Variables = object> =
  | string
  | TypedDocumentNode<Data, { storeId: string } & Variables>;

type QueryResult<Data = any> = readonly [
  Data | undefined,
  { readonly fetching: boolean; readonly error?: CombinedError },
  (opts?: Partial<OperationContext>) => void,
];

type QueryHook<Data = any, Variables = object> = (
  variables?: Omit<Variables, 'storeId'>,
) => QueryResult<Data>;

type ProcessFn<Data = any, Result = object> = (data: Data) => Result;

export type QueryResultData<QueryHook extends () => any> = NonNullable<
  ReturnType<QueryHook>[0]
>;

export type QueryResultField<
  QueryHook extends (...args: any[]) => any,
  T extends string,
> = QueryResultData<QueryHook>[T];

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
      variables: typeCast({ storeId: storeAddress!, ...variables }),
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
