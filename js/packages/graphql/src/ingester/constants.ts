import {
  AUCTION_ID,
  AUCTION_PROCESSOR,
  METADATA_PROCESSOR,
  METADATA_PROGRAM_ID,
  METAPLEX_ACCOUNTS_PROCESSOR,
  METAPLEX_ID,
  VAULT_ID,
  VAULT_PROCESSOR,
} from '../common';
import { ProgramParserMap } from './types';

export const PROGRAMS: ProgramParserMap = [
  {
    pubkey: VAULT_ID,
    ...VAULT_PROCESSOR,
  },
  {
    pubkey: AUCTION_ID,
    ...AUCTION_PROCESSOR,
  },
  {
    pubkey: METAPLEX_ID,
    ...METAPLEX_ACCOUNTS_PROCESSOR,
  },
  {
    pubkey: METADATA_PROGRAM_ID,
    ...METADATA_PROCESSOR,
  },
];
