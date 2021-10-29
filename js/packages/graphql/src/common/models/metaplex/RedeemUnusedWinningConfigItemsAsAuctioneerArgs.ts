import { ProxyCallAddress } from "./ProxyCallAddress";

export class RedeemUnusedWinningConfigItemsAsAuctioneerArgs {
  instruction = 12;
  winningConfigItemIndex: number;
  proxyCall: ProxyCallAddress;
  constructor(args: {
    winningConfigItemIndex: number;
    proxyCall: ProxyCallAddress;
  }) {
    this.winningConfigItemIndex = args.winningConfigItemIndex;
    this.proxyCall = args.proxyCall;
  }
}
