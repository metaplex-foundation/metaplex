import { PassThrough } from 'stream';
import { ChunkedData } from './ChunkedData';
import { SourceData } from './SourceData';

describe('ChunkedData', () => {
  interface ITest {
    name: string;
    data: string;
    meta: string;
  }
  const LEN = 1000;
  const result: ITest[] = [];
  for (let i = 0; i < LEN; i++) {
    result.push({
      name: `Test ${i}`,
      data: `Data ${i}`,
      meta: `Meta ${i}`,
    });
  }
  const json = JSON.stringify({ version: 'test', result });

  it('test with buffer', async () => {
    const buffer = Buffer.from(json, 'utf-8');
    const step = 10;
    const source = new SourceData(buffer, { step });

    const chunked = new ChunkedData<ITest>(source, (ctx, value, cb) => {
      if (ctx.stack.length === 2 && ctx.stack[1].key === 'result') {
        cb(value);
      }
    });
    const result = new Array<ITest>();
    for await (const iterator of chunked) {
      for (const item of iterator) {
        const i = result.length;
        if (item.name !== `Test ${i}`) {
          throw new Error(`Invalid name: ${item.name}`);
        }
        if (item.data !== `Data ${i}`) {
          throw new Error(`Invalid data: ${item.name}`);
        }
        if (item.meta !== `Meta ${i}`) {
          throw new Error(`Invalid meta: ${item.name}`);
        }
        result[i] = item;
      }
    }
    expect(result.length).toBe(LEN);
  });

  it('test with stream', async () => {
    const stream = new PassThrough();
    const source = new SourceData(stream);
    const step = Math.round(json.length / 20);
    async function fill() {
      for (let i = 0; i < json.length; i += step) {
        const chunk = json.slice(i, i + step);
        const data = Buffer.from(chunk, 'utf-8');
        stream.write(data);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      stream.end();
    }
    fill();

    const chunked = new ChunkedData<ITest>(source, (ctx, value, cb) => {
      if (ctx.stack.length === 2 && ctx.stack[1].key === 'result') {
        cb(value);
      }
    });
    const result = new Array<ITest>();
    for await (const iterator of chunked) {
      for (const item of iterator) {
        const i = result.length;
        if (item.name !== `Test ${i}`) {
          throw new Error(`Invalid name: ${item.name}`);
        }
        if (item.data !== `Data ${i}`) {
          throw new Error(`Invalid data: ${item.name}`);
        }
        if (item.meta !== `Meta ${i}`) {
          throw new Error(`Invalid meta: ${item.name}`);
        }
        result[i] = item;
      }
    }
    expect(result.length).toBe(LEN);
  });
});
