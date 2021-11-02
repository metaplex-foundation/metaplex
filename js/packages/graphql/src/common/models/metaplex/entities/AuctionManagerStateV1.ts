import { JsonProperty, Serializable } from "typescript-json-serializer";
import { AuctionManagerStatus } from "../AuctionManagerStatus";
import { ParticipationStateV1 } from "./ParticipationStateV1";
import { WinningConfigState } from "./WinningConfigState";

@Serializable()
export class AuctionManagerStateV1 {
  @JsonProperty()
  status: AuctionManagerStatus = AuctionManagerStatus.Initialized;

  @JsonProperty()
  winningConfigItemsValidated: number = 0;

  @JsonProperty()
  winningConfigStates: WinningConfigState[] = [];

  @JsonProperty()
  participationState: ParticipationStateV1 | null = null;

  constructor(args?: AuctionManagerStateV1) {
    Object.assign(this, args);
  }
}
