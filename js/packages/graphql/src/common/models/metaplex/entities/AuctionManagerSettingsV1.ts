import { WinningConfig } from "./WinningConfig";
import { ParticipationConfigV1 } from "./ParticipationConfigV1";
import { JsonProperty, Serializable } from "typescript-json-serializer";

@Serializable()
export class AuctionManagerSettingsV1 {
  @JsonProperty()
  winningConfigs: WinningConfig[] = [];

  @JsonProperty()
  participationConfig: ParticipationConfigV1 | null = null;

  constructor(args?: AuctionManagerSettingsV1) {
    Object.assign(this, args);
  }
}
