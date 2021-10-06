import type { IMetaplexApi } from "../api/IMetaplexApi";
import type { MetaplexService } from "../api/MetaplexService";

export interface Context {
  network?: string;
  api: IMetaplexApi;
  service: MetaplexService;
}
