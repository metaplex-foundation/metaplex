export async function createPipelineExecutor<T>(
  data: IterableIterator<T>,
  executor: (d: T) => void,
  {
    delay = 0,
    jobsCount = 1,
    sequence = 1,
  }: {
    delay?: number;
    jobsCount?: number;
    sequence?: number;
  } = {},
) {
  function execute<T>(iter: IteratorResult<T, any>) {
    executor(iter.value);
  }

  async function next() {
    if (sequence <= 1) {
      const iter = data.next();
      if (iter.done) {
        return;
      }
      await execute(iter);
    } else {
      const promises: any[] = [];
      let isDone = false;
      for (let i = 0; i < sequence; i++) {
        const iter = data.next();
        if (!iter.done) {
          promises.push(execute(iter));
        } else {
          isDone = true;
          break;
        }
      }
      await Promise.all(promises);
      if (isDone) {
        return;
      }
    }
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
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
