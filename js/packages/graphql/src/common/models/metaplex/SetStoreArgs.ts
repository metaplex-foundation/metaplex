export class SetStoreArgs {
  instruction = 8;
  public: boolean;
  constructor(args: { public: boolean }) {
    this.public = args.public;
  }
}
