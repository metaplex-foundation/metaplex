import {
  AUCTION_ID,
  METADATA_PROGRAM_ID,
  METAPLEX_ID,
  processAuctions,
  processMetaData,
  processMetaplexAccounts,
  processVaultData,
  VAULT_ID,
} from "common";
import { ProgramParserMap } from "./types";

export const PROGRAMS: ProgramParserMap = [
  {
    pubkey: VAULT_ID,
    process: processVaultData,
  },
  {
    pubkey: AUCTION_ID,
    process: processAuctions,
  },
  {
    pubkey: METAPLEX_ID,
    process: processMetaplexAccounts,
  },
  {
    pubkey: METADATA_PROGRAM_ID,
    process: processMetaData,
  },
];
