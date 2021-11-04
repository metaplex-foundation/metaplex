import { StringPublicKey } from "../../utils";
import { getWhitelistedCreator } from "./getWhitelistedCreator";

export async function isCreatorPartOfTheStore(
  creatorAddress: StringPublicKey,
  pubkey: StringPublicKey,
  store?: StringPublicKey
) {
  const creatorKeyInStore = await getWhitelistedCreator(creatorAddress, store);

  return creatorKeyInStore === pubkey;
}
