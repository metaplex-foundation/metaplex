import after from "lodash/after";
import logger from "../logger";

export async function createPipelineExecutor<T>(
  data: IterableIterator<T>,
  executor: (d: T, index: number) => void,
  {
    delay = 0,
    jobsCount = 1,
    name,
    sequence = 10,
    completeGroup = 10000,
  }: {
    delay?: number;
    jobsCount?: number;
    name?: string;
    sequence?: number;
    completeGroup?: number;
  }
) {
  let index = 0;
  let complete = 0;

  function execute<T>(iter: IteratorResult<T, any>) {
    index++;
    const numIndex = index;
    // TODO: wait for async executor
    executor(iter.value, numIndex);
    complete++;
    if (name && complete % completeGroup === 0) {
      logger.info(`${name}: ${complete} tasks were processed`);
    }
  }

  async function next() {
    const iter = data.next();
    if (iter.done) {
      return;
    }
    if (sequence <= 1) {
      execute(iter);
    } else {
      const exec = after(sequence, () => execute(iter));
      for (let i = 0; i < sequence; i++) {
        exec();
      }
    }
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      await Promise.resolve();
    }
    await next();
  }
  const result = new Array<Promise<void>>(jobsCount);
  for (let i = 0; i < jobsCount; i++) {
    result[i] = next();
  }
  await Promise.all(result);
}
