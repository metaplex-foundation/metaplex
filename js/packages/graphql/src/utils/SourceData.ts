import { PassThrough } from 'stream';

export class SourceData implements AsyncIterable<Buffer> {
  constructor(
    private readonly buffer: Buffer | PassThrough,
    private readonly options?: { step: number },
  ) {
    if (!Buffer.isBuffer(buffer)) {
      buffer.on('data', chunk => {
        this.container.push(chunk);
        this.fn.forEach(fn => fn());
        if (this.fn.length) {
          this.fn = [];
        }
      });
      buffer.on('end', () => {
        this.fn.forEach(fn => fn());
        if (this.fn.length) {
          this.fn = [];
        }
      });
    }
  }

  private fn: Array<Function> = [];
  private container: Array<Buffer> = [];

  [Symbol.asyncIterator]() {
    const step = this.options?.step ?? 1e6; /* 1mb */
    let start = 0;

    if (Buffer.isBuffer(this.buffer)) {
      const buffer = this.buffer;
      const next = async function () {
        if (start < buffer.byteLength) {
          const end = start + step;
          const chunk = buffer.slice(start, end);
          start = end;
          const ret: IteratorResult<Buffer, null> = {
            done: false,
            value: chunk,
          };
          return ret;
        } else {
          const ret: IteratorResult<Buffer, null> = {
            done: true,
            value: null,
          };
          return ret;
        }
      };
      return { next };
    } else {
      const buffer = this.buffer;
      const ctx = this;
      const next = async function () {
        for (;;) {
          if (start < ctx.container.length) {
            const ret: IteratorResult<Buffer, null> = {
              done: false,
              value: ctx.container[start],
            };
            start++;
            return ret;
          } else if (!buffer.writableEnded) {
            await new Promise(resolve => ctx.fn.push(resolve));
          } else {
            const ret: IteratorResult<Buffer, null> = {
              done: true,
              value: null,
            };
            return ret;
          }
        }
      };
      return { next };
    }
  }
}
