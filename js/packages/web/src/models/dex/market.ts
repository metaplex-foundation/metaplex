import { contexts, ParsedAccountBase } from '@oyster/common';
import { Market, MARKETS, Orderbook } from '@project-serum/serum';
import { AccountInfo, PublicKey } from '@solana/web3.js';
const { MintParser, cache } = contexts.Accounts;

export const OrderBookParser = (id: PublicKey, acc: AccountInfo<Buffer>) => {
  const decoded = Orderbook.LAYOUT.decode(acc.data);

  const details = {
    pubkey: id,
    account: {
      ...acc,
    },
    info: decoded,
  } as ParsedAccountBase;

  return details;
};

const DEFAULT_DEX_ID = new PublicKey(
  'EUqojwWA2rd19FZrzeBncJsm38Jm1hEhE3zsmX3bRc2o',
);

export const DexMarketParser = (
  pubkey: PublicKey,
  acc: AccountInfo<Buffer>,
) => {
  const market = MARKETS.find(m => m.address.equals(pubkey));
  const decoded = Market.getLayout(market?.programId || DEFAULT_DEX_ID).decode(
    acc.data,
  );

  const details = {
    pubkey,
    account: {
      ...acc,
    },
    info: decoded,
  } as ParsedAccountBase;

  cache.registerParser(details.info.baseMint, MintParser);
  cache.registerParser(details.info.quoteMint, MintParser);
  cache.registerParser(details.info.bids, OrderBookParser);
  cache.registerParser(details.info.asks, OrderBookParser);

  return details;
};
