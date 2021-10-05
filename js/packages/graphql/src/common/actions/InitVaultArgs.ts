export class InitVaultArgs {
  instruction: number = 0;
  allowFurtherShareCreation: boolean = false;

  constructor(args: { allowFurtherShareCreation: boolean }) {
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
  }
}
