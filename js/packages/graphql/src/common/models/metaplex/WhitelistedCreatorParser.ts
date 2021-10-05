import { StringPublicKey, AccountInfoOwnerString } from "../../utils";
import { decodeWhitelistedCreator } from "./decodeWhitelistedCreator";

export function WhitelistedCreatorParser(
  pubkey: StringPublicKey,
  account: AccountInfoOwnerString<Buffer>
) {
  return {
    pubkey,
    account,
    info: decodeWhitelistedCreator(account.data),
  };
}
