import { Reader } from "../reader";

export interface Context {
  network?: string;
  api: Reader;
}
