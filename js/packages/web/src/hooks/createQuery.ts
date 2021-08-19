import {
  useQuery,
  TypedDocumentNode,
  CombinedError,
  OperationContext,
} from 'urql';
import { useEffect, useMemo } from 'react';
import { useStore } from '@oyster/common/dist/lib/contexts/index';

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

export type QueryResultField<QueryHook extends () => any, T extends string> =
  QueryResultData<QueryHook>[T];

export function createQuery<Data = any, Variables = object>(
  query: Query<Data, Variables>,
): QueryHook<Data, Variables>;
export function createQuery<Data = any, Variables = object, Result = object>(
  query: Query<Data, Variables>,
  fn: ProcessFn<Data, Result>,
): QueryHook<Result, Variables>;

export function createQuery<Data = any, Variables = object, Result = object>(
  query: Query<Data, Variables>,
  postProcess?: ProcessFn<Data, Result>,
): QueryHook<Data, Variables> {
  return variables => {
    const { storeAddress } = useStore();

    const [result, reexecuteQuery] = useQuery({
      query,
      variables: { storeId: storeAddress!, ...variables },
      pause: !storeAddress,
    });

    const resultData = useMemo(() => {
      if (result.data && postProcess) {
        return postProcess(result.data) as unknown as Data;
      }
      return result.data;
    }, [result.data, postProcess]);

    // TODO: throw error if storeAddress is not configured
    return [
      resultData as Data | undefined,
      {
        fetching: result.fetching || !storeAddress,
        error: result.error,
      },
      reexecuteQuery,
    ] as const;
  };
}
