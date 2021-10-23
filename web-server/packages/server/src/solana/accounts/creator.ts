import { MetaplexKey, METAPLEX_PREFIX } from "./types";
import { METAPLEX_ID, StringPublicKey, toPublicKey } from "../ids";
import { findProgramAddressBase58 } from "../utils";
import { ConverterSet } from "../serialization/converterSet";
import {deserializeUnchecked} from 'borsh';


export class WhitelistedCreator {
    key: MetaplexKey = MetaplexKey.WhitelistedCreatorV1;
    address: StringPublicKey;
    activated: boolean = true;

    // Populated from name service
    twitter?: string;
    name?: string;
    image?: string;
    description?: string;

    constructor(args: { address: string; activated: boolean }) {
      this.address = args.address;
      this.activated = args.activated;
    }
  }

  export const isCreatorPartOfTheStore = async (
    creatorAddress: StringPublicKey,
    pubkey: StringPublicKey,
    store: StringPublicKey,
  ) => {
    const creatorKeyInStore = await getWhitelistedCreator(creatorAddress, store);

    return creatorKeyInStore === pubkey;
  };


  export async function getWhitelistedCreator(
    creator: StringPublicKey,
    storeId: StringPublicKey,
  ) {
    const res = await findProgramAddressBase58(
        [
          Buffer.from(METAPLEX_PREFIX),
          toPublicKey(METAPLEX_ID).toBuffer(),
          toPublicKey(storeId).toBuffer(),
          toPublicKey(creator).toBuffer(),
        ],
        toPublicKey(METAPLEX_ID),
      );

      return res[0];
  }

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


