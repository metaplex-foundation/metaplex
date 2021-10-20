import Parser from 'jsonparse';
import { PassThrough } from 'stream';
import { ChunkedData } from './ChunkedData';
import { SourceData } from './SourceData';
export interface IPagination {
  next(): IPagination | undefined;
}

export class JSONLazyResponse<T = any>
  implements AsyncIterable<IterableIterator<T>>
{
  static rpcResponse<T = any>(buffer: Buffer | PassThrough, cleanup = false) {
    return new JSONLazyResponse<T>(buffer, (ctx, value, cb) => {
      if (ctx.stack.length === 2 && ctx.stack[1].key === 'result') {
        cb(value);
        if (cleanup) {
          const { result } = ctx.stack[1].value;
          if (Array.isArray(result)) {
            // allow GC remove object from memory
            result.length = 0;
          }
        }
      }
    });
  }

  private readonly sourceData: SourceData;
  private readonly chunkedData: ChunkedData<T>;

  constructor(
    buffer: Buffer | PassThrough | SourceData,
    readonly onValue?: (ctx: Parser, value: any, cb: (item: T) => void) => void,
  ) {
    if (buffer instanceof SourceData) {
      this.sourceData = buffer;
    } else {
      this.sourceData = new SourceData(buffer);
    }
    this.chunkedData = new ChunkedData(this.sourceData, onValue);
  }

  public async json<O>() {
    const p = new Parser();
    let obj: any;
    p.onValue = value => {
      obj = value;
    };
    for await (const value of this.sourceData) {
      p.write(value);
    }
    return obj as O;
  }

  public values() {
    return this.chunkedData.values();
  }

  [Symbol.asyncIterator]() {
    return this.values();
  }

  public transform<O>(update: (item: T) => O) {
    const onValue = this.onValue;
    return new JSONLazyResponse<O>(
      this.sourceData,
      !onValue
        ? undefined
        : (ctx, value, cb) => onValue(ctx, value, item => cb(update(item))),
    );
  }
}
