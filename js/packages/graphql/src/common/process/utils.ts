import { AccountInfoOwnerString, PublicKeyStringAndAccount } from '../utils';
import type { MetaMap, UpdateStateValueFunc } from './types';
import { IProcessor } from '../../ingester';

export function createProcessor<T>(
  is: (acc: AccountInfoOwnerString<Buffer>) => boolean,
  process: (acc: PublicKeyStringAndAccount<Buffer>) => T | undefined,
): IProcessor<T> {
  return {
    is,
    process(acc: PublicKeyStringAndAccount<Buffer>) {
      return is(acc.account) ? process(acc) : undefined;
    },
  };
}

export function createPipeline<T extends Record<string, IProcessor<any>>>(
  processors: T,
  isProcessor: (acc: AccountInfoOwnerString<Buffer>) => boolean,
) {
  const process = async (
    data: PublicKeyStringAndAccount<Buffer>,
    setter: UpdateStateValueFunc<MetaMap, keyof MetaMap>,
  ) => {
    if (!isProcessor(data.account)) {
      return;
    }
    for (const [prop, processor] of Object.entries(processors)) {
      if (processor.is(data.account)) {
        try {
          const result = processor.process(data);
          await setter(prop as keyof MetaMap, data.pubkey, result);
        } catch (err) {
          // logger.warn(err);
        }
      }
    }
  };
  return { processors, process, isProcessor };
}
