export const AUCTION_PREFIX = 'auction';
export const METADATA = 'metadata';
export const EXTENDED = 'extended';

export const MAX_AUCTION_DATA_EXTENDED_SIZE = 8 + 9 + 2 + 200;

export const BASE_AUCTION_DATA_SIZE =
  32 + 32 + 32 + 9 + 9 + 9 + 9 + 1 + 32 + 1 + 8 + 8;

export const BIDDER_METADATA_LEN = 32 + 32 + 8 + 8 + 1;
export const BIDDER_POT_LEN = 32 + 32 + 32 + 1;
