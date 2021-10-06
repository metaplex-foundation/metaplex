import { clusterApiUrl } from "@solana/web3.js";
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
import { EndpointsMap, ProgramParserMap } from "./types";

export const ENDPOINTS: EndpointsMap = [
  {
    name: "mainnet-beta",
    endpoint: "https://api.metaplex.solana.com/",
  },
  {
    name: "testnet",
    endpoint: clusterApiUrl("testnet"),
  },
  {
    name: "devnet",
    endpoint: clusterApiUrl("devnet"),
  },
];

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
