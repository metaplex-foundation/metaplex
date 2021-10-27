declare module 'jsonparse' {
  export default class JSONParse {
    write(data: string | Buffer | ArrayBuffer): void;
    onToken(token: string, value: any): void;
    onValue(this: JSONParse, value: any): void;
    readonly key: string | number;
    readonly stack: Array<{
      key: string | number | undefined;
      value: any;
      mode: any;
    }>;
  }
}
