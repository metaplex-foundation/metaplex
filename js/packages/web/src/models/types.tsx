import { AccountParser, decodeAuctionManager, decodeEdition, decodeMasterEdition, decodeMetadata, decodeWhitelistedCreator, StringPublicKey} from "@oyster/common";
import { PublicKey } from "@solana/web3.js";

export type AccountAndPubkey = {
    pubkey: string;
    account: AccountInfo<Buffer>;
  };

  export type AccountInfo<T> = {
    executable: boolean;
    owner: PublicKey;
    lamports: number;
    data: T;
  };

  export const WhitelistedCreatorParser: AccountParser = (
    pubkey: StringPublicKey,
    account: AccountInfo<Buffer>,
  ) => ({
    pubkey,
    account,
    info: decodeWhitelistedCreator(account.data),
  });

  export const WhitelistedMetadataParser: AccountParser = (
    pubkey: StringPublicKey,
    account: AccountInfo<Buffer>,
  ) => ({
    pubkey,
    account,
    info: decodeMetadata(account.data),
  });

  export const WhitelistedMasterEditionVParser: AccountParser = (
    pubkey: StringPublicKey,
    account: AccountInfo<Buffer>,
  ) => ({
    pubkey,
    account,
    info: decodeMasterEdition(account.data),
  });


  
  export const WhitelistedAuctionManagerParser: AccountParser = (
    pubkey: StringPublicKey,
    account: AccountInfo<Buffer>,
  ) => ({
    pubkey,
    account,
    info: decodeAuctionManager(account.data),
  });
  

  export const WhitelistedEditionParser: AccountParser = (
    pubkey: StringPublicKey,
    account: AccountInfo<Buffer>,
  ) => ({
    pubkey,
    account,
    info: decodeEdition(account.data),
  });


