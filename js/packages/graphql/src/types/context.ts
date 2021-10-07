import type { MetaplexService } from "../api/MetaplexService";
import { Reader } from "../reader";

export interface Context {
  network?: string;
  api: Reader;
  service: MetaplexService;
}
