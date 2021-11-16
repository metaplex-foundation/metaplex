import { ParsedAccount } from '@oyster/common';
import { PackSet } from '@oyster/common/dist/lib/models/packs/accounts/PackSet';

import { AuctionView } from '../../../../hooks';

export type Sale = AuctionView | ParsedAccount<PackSet>;
