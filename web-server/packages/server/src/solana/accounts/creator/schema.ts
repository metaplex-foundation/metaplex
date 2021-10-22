import { WhitelistedCreator } from "./creator";
import {deserializeUnchecked} from 'borsh';

const SCHEMA = new Map<any, any>([
    [
        WhitelistedCreator,
        {
          kind: 'struct',
          fields: [
            ['key', 'u8'],
            ['address', 'pubkeyAsString'],
            ['activated', 'u8'],
          ],
        },
      ]
]);

export const decodeWhitelistedCreator = (buffer: Buffer) => {
    return deserializeUnchecked(
      SCHEMA,
      WhitelistedCreator,
      buffer,
    ) as WhitelistedCreator;
  };


