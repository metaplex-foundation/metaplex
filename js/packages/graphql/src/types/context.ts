import type { IMetaplexApi } from "../api/IMetaplexApi";

export interface Context {
  network?: string;
  api: IMetaplexApi;
}
