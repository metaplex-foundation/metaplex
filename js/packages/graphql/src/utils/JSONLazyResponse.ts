import Parser from 'jsonparse';

export interface IPagination {
  next(): IPagination | undefined;
}

export class JSONLazyResponse<T = any> {
  static rpcResponse<T = any>(buffer: Buffer, cleanup = false) {
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

  constructor(
    private readonly buffer: Buffer,
    private readonly onValue?: (
      ctx: Parser,
      value: any,
      cb: (item: T) => void,
    ) => void,
  ) {}

  private createPaginator(
    p: Parser,
    start = 0,
    step = 1e6 /* 1mb */,
  ): IPagination | undefined {
    return {
      next: () => this.paginate(p, start, step),
    };
  }

  private paginate(
    p: Parser,
    start: number,
    step: number,
  ): undefined | IPagination {
    const end = start + step;
    if (start < this.buffer.byteLength) {
      const chunk = this.buffer.slice(start, end);
      p.write(chunk);
      start = end;
    } else {
      return undefined;
    }
    return this.createPaginator(p, start, step);
  }

  public json<O>() {
    const p = new Parser();
    let obj: any;
    p.onValue = value => {
      obj = value;
    };
    let paginator = this.createPaginator(p);
    while (paginator) {
      paginator = paginator.next();
    }
    return obj as O;
  }

  public values(opts?: { step: number }): Iterable<T> {
    return {
      [Symbol.iterator]: () => {
        const p = new Parser();
        const onValue = this.onValue;
        let list = new Array<T>();
        let iterator = list.values();
        let pagination = this.createPaginator(p, 0, opts?.step);

        if (onValue) {
          p.onValue = function (this: Parser, value: any) {
            onValue(this, value, item => list.push(item));
          };
        }

        const ret: Iterator<T> = {
          next() {
            for (;;) {
              const result = iterator.next();
              if (!result.done) {
                return result;
              }

              if (!pagination) {
                return {
                  value: undefined as any,
                  done: true,
                };
              }
              // create new list if existing full
              if (list.length) {
                list = new Array<T>();
              }
              pagination = pagination.next();
              iterator = list.values();
              // check iterator once again
            }
          },
        };
        return ret;
      },
    };
  }

  public transform<O>(update: (item: T) => O) {
    const onValue = this.onValue;
    return new JSONLazyResponse<O>(
      this.buffer,
      !onValue
        ? undefined
        : (ctx, value, cb) => onValue(ctx, value, item => cb(update(item))),
    );
  }
}
