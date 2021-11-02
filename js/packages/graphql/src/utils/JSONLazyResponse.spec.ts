import { JSONLazyResponse } from './JSONLazyResponse';

describe('JSONLazyResponse', () => {
  describe('JSONLazyResponse::values() big json data', () => {
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
    const buffer = Buffer.from(json, 'utf-8');

    it('test', async () => {
      const resp = new JSONLazyResponse<ITest>(buffer, (ctx, value, cb) => {
        if (ctx.stack.length === 2 && ctx.stack[1].key === 'result') {
          cb(value);
        }
      });
      let count = 0;
      for await (const iter of resp) {
        for (const item of iter) {
          if (item.name !== `Test ${count}`) {
            throw new Error(`Invalid name: ${item.name}`);
          }
          if (item.data !== `Data ${count}`) {
            throw new Error(`Invalid data: ${item.name}`);
          }
          if (item.meta !== `Meta ${count}`) {
            throw new Error(`Invalid meta: ${item.name}`);
          }
          count++;
        }
      }
      expect(count).toBe(LEN);
    });

    it('rpcResponse with cleanup', async () => {
      const resp = JSONLazyResponse.rpcResponse<ITest>(buffer, true);
      let count = 0;
      for await (const iter of resp) {
        for (const item of iter) {
          if (item.name !== `Test ${count}`) {
            throw new Error(`Invalid name: ${item.name}`);
          }
          if (item.data !== `Data ${count}`) {
            throw new Error(`Invalid data: ${item.name}`);
          }
          if (item.meta !== `Meta ${count}`) {
            throw new Error(`Invalid meta: ${item.name}`);
          }
          count++;
        }
      }
      expect(count).toBe(LEN);
    });

    it('rpcResponse without cleanup', async () => {
      const resp = JSONLazyResponse.rpcResponse<ITest>(buffer, false);
      let count = 0;
      for await (const iter of resp) {
        for (const item of iter) {
          if (item.name !== `Test ${count}`) {
            throw new Error(`Invalid name: ${item.name}`);
          }
          if (item.data !== `Data ${count}`) {
            throw new Error(`Invalid data: ${item.name}`);
          }
          if (item.meta !== `Meta ${count}`) {
            throw new Error(`Invalid meta: ${item.name}`);
          }
          count++;
        }
      }
      expect(count).toBe(LEN);
    });
  });

  it('JSONLazyResponse::json()', async () => {
    const obj = {
      a: 1,
      b: 2,
      c: 3,
    };
    const buffer = Buffer.from(JSON.stringify(obj), 'utf-8');

    const resp = new JSONLazyResponse(buffer);
    const result = await resp.json();
    expect(result).toEqual(obj);
  });
});
