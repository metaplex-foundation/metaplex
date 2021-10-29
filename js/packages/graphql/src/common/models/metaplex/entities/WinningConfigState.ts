import { WinningConfigStateItem } from "./WinningConfigStateItem";
import { JsonProperty, Serializable } from "typescript-json-serializer";

@Serializable()
export class WinningConfigState {
  @JsonProperty()
  items: WinningConfigStateItem[] = [];

  @JsonProperty()
  moneyPushedToAcceptPayment: boolean = false;

  constructor(args?: WinningConfigState) {
    Object.assign(this, args);
  }
}
