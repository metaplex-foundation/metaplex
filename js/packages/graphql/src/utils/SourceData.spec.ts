import { SourceData } from './SourceData';
import { PassThrough } from 'stream';

describe('SourceData', () => {
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

  it('Buffer', async () => {
    const buffer = Buffer.from(json, 'utf-8');
    const step = 10;
    const source = new SourceData(buffer, { step });
    const buf: string[] = [];
    for await (const chunk of source) {
      buf.push(chunk.toString());
    }
    expect(buf.length).toBe(Math.ceil(json.length / step));
    const result = buf.join('');
    expect(result).toBe(json);
  });

  it('Stream', async () => {
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
    const buf: string[] = [];
    for await (const chunk of source) {
      buf.push(chunk.toString());
    }
    expect(buf.length).toBe(Math.ceil(json.length / step));
    const result = buf.join('');
    expect(result).toBe(json);
  });

  it('Twice usage error', async () => {
    const buffer = Buffer.from(json, 'utf-8');
    const source = new SourceData(buffer);
    source.values();
    expect(() => source.values()).toThrowError("Can't be used more then once");
  });
});
