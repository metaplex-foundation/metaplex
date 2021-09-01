type Maybe<T> = T | null;
export type PickProps<T, TName extends keyof T> = Pick<T, TName>[TName];

export function notNullable<T>(t: Maybe<T>): t is T {
  return t !== undefined && t !== null;
}

export function typeCast<T>(t: unknown): T {
  return t as T;
}
