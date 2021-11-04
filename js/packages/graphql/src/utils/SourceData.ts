import { PassThrough } from 'stream';
import { LinkedList } from 'linked-list-typescript';

export class SourceData implements AsyncIterable<Buffer> {
  constructor(
    private readonly buffer: Buffer | PassThrough,
    private readonly options?: { step: number },
  ) {
    if (!Buffer.isBuffer(buffer)) {
      buffer.on('data', chunk => {
        this.container.append(chunk);
        while (this.fn.length) {
          const fn = this.fn.removeHead();
          fn();
        }
      });
      buffer.on('end', () => {
        while (this.fn.length) {
          const fn = this.fn.removeHead();
          fn();
        }
        buffer.removeAllListeners();
      });
    }
  }

  private fn = new LinkedList<Function>();

  private container = new LinkedList<Buffer>();
  private using = false;

  values() {
    if (this.using) {
      throw new Error("Can't be used more then once");
    }
    this.using = true;
    if (Buffer.isBuffer(this.buffer)) {
      let start = 0;
      const step = this.options?.step ?? 1e6; /* 1mb */
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
          if (ctx.container.length) {
            const head = ctx.container.removeHead();
            const ret: IteratorResult<Buffer, null> = {
              done: false,
              value: head,
            };
            return ret;
          } else if (!buffer.writableEnded) {
            await new Promise(resolve => ctx.fn.append(resolve));
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

  [Symbol.asyncIterator]() {
    return this.values();
  }
}
