import { sleep } from './sleep';
import logger from '../logger';

export async function createPipelineExecutor<T>(
  iter: Iterable<T>,
  executor: (d: T, index: number) => void | Promise<void>,
  {
    delay = 0,
    jobsCount = 1,
    name,
    sequence = 10,
    completeGroup = 10000,
    log = logger,
  }: {
    delay?: number | (() => Promise<void>);
    jobsCount?: number;
    name?: string;
    sequence?: number;
    completeGroup?: number;
    log?: typeof logger;
  },
) {
  let index = 0;
  let complete = 0;
  const data = iter[Symbol.iterator]();

  function execute<T>(iter: IteratorResult<T, any>) {
    const numIndex = index;

    const ret = executor(iter.value, numIndex);
    if (ret) {
      return ret.then(() => {
        complete++;
        if (name && complete % completeGroup === 0) {
          log.info(`${name}: ${complete} tasks were processed`);
        }
      });
    }
    complete++;
    if (name && complete % completeGroup === 0) {
      log.info(`${name}: ${complete} tasks were processed`);
    }
  }

  async function next() {
    let iter = data.next();
    while (!iter.done) {
      index++;
      if (sequence <= 1) {
        const ret = execute(iter);
        if (ret) {
          await ret.catch(() => {});
        }
      } else {
        const group = new Array<Promise<void>>(sequence);
        let awaiter = false;
        for (let i = 0; i < sequence; i++) {
          if (i) {
            iter = data.next();
            if (iter.done) {
              break;
            }
          }
          const ret = execute(iter);
          if (ret) {
            awaiter = true;
            group[i] = ret;
          }
        }
        if (awaiter) {
          await Promise.all(group).catch(() => {});
        }
      }
      if (delay instanceof Function) {
        await delay();
      } else if (delay > 0) {
        await sleep(delay);
      }
      iter = data.next();
    }
  }
  const result = new Array<Promise<void>>(jobsCount);
  for (let i = 0; i < jobsCount; i++) {
    result[i] = next();
  }
  await Promise.all(result);
}
