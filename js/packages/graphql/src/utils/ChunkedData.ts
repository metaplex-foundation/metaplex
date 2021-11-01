import Parser from 'jsonparse';
import { SourceData } from './SourceData';

export class ChunkedData<T> implements AsyncIterable<IterableIterator<T>> {
  constructor(
    private readonly source: SourceData,
    private readonly onValue?: (
      ctx: Parser,
      value: any,
      cb: (item: T) => void,
    ) => void,
  ) {}

  values(): AsyncIterator<IterableIterator<T>> {
    const iterator = this.source[Symbol.asyncIterator]();
    const p = new Parser();
    let list: Array<T>;
    const onValue = this.onValue;
    if (onValue) {
      p.onValue = function (this: Parser, value: any) {
        onValue(this, value, item => list.push(item));
      };
    }

    return {
      next: async function () {
        const { done, value } = await iterator.next();
        if (done) {
          return {
            done: true,
            value: undefined as any,
          };
        }
        list = [];
        p.write(value!);
        return {
          done: false,
          value: list.values(),
        };
      },
    };
  }

  [Symbol.asyncIterator]() {
    return this.values();
  }
}
