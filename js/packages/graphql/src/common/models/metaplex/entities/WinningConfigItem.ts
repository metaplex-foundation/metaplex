import { WinningConfigType } from "../WinningConfigType";
import { JsonProperty, Serializable } from "typescript-json-serializer";

@Serializable()
export class WinningConfigItem {
  @JsonProperty()
  safetyDepositBoxIndex: number = 0;

  @JsonProperty()
  amount: number = 0;

  @JsonProperty()
  winningConfigType: WinningConfigType = WinningConfigType.TokenOnlyTransfer;

  constructor(args?: WinningConfigItem) {
    Object.assign(this, args);
  }
}
