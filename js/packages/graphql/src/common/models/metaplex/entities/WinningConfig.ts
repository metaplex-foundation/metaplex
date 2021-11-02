import { WinningConfigItem } from "./WinningConfigItem";
import { JsonProperty, Serializable } from "typescript-json-serializer";
@Serializable()
export class WinningConfig {
  @JsonProperty()
  items: WinningConfigItem[] = [];

  constructor(args?: WinningConfig) {
    Object.assign(this, args);
  }
}
