import { JsonProperty, Serializable } from "typescript-json-serializer";
@Serializable()
export class WinningConfigStateItem {
  @JsonProperty()
  primarySaleHappened: boolean = false;

  @JsonProperty()
  claimed: boolean = false;

  constructor(args?: WinningConfigStateItem) {
    Object.assign(this, args);
  }
}
