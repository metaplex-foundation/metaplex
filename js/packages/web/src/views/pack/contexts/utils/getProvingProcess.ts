import {
  findProvingProcessProgramAddress,
  ParsedAccount,
  toPublicKey,
} from '@oyster/common';
import { ProvingProcess } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import { requestCards } from '../../transactions/requestCards';
import {
  GetProvingProcessParams,
  RequestCardsUsingVoucherParams,
} from '../interface';
import { fetchProvingProcessWithRetry } from './fetchProvingProcessWithRetry';

export const getProvingProcess = async ({
  pack,
  provingProcessKey,
  voucherTokenAccount,
  voucherKey,
  editionKey,
  editionMint,
  connection,
  wallet,
}: GetProvingProcessParams): Promise<ParsedAccount<ProvingProcess>> => {
  // ToDo: This will be executed even if not all the cards are requested.
  if (provingProcessKey) {
    return fetchProvingProcessWithRetry({
      provingProcessKey,
      connection,
    });
  }

  if (!voucherKey) {
    throw new Error('Voucher is missing');
  }

  return requestCardsUsingVoucher({
    pack,
    voucherTokenAccount,
    voucherKey,
    editionKey,
    editionMint,
    connection,
    wallet,
  });
};

const requestCardsUsingVoucher = async ({
  pack,
  voucherTokenAccount,
  voucherKey,
  editionKey,
  editionMint,
  connection,
  wallet,
}: RequestCardsUsingVoucherParams): Promise<ParsedAccount<ProvingProcess>> => {
  if (!wallet.publicKey) {
    throw new WalletNotConnectedError();
  }

  const cardsLeftToOpen = pack.info.allowedAmountToRedeem;

  await requestCards({
    pack,
    voucherKey,
    editionKey,
    editionMint,
    connection,
    wallet,
    cardsLeftToOpen,
    tokenAccount: voucherTokenAccount.pubkey,
  });

  const provingProcessKey = await findProvingProcessProgramAddress(
    toPublicKey(pack.pubkey),
    toPublicKey(wallet.publicKey),
    toPublicKey(editionMint),
  );

  return fetchProvingProcessWithRetry({
    provingProcessKey,
    connection,
  });
};
