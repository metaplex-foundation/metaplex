import { Reader } from "reader";
import type { MetaplexService } from "../api/MetaplexService";

export interface Context {
  network?: string;
  api: Reader;
  service: MetaplexService;
}
