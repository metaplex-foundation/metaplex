import { AuctionManagerSettingsV1 } from "./entities";

export class DeprecatedInitAuctionManagerV1Args {
  instruction = 0;
  settings: AuctionManagerSettingsV1;

  constructor(args: { settings: AuctionManagerSettingsV1 }) {
    this.settings = args.settings;
  }
}
