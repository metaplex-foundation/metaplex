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
  voucherEditionKey,
  userVouchers,
  accountByMint,
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

  if (!voucherEditionKey || !userVouchers[voucherEditionKey]) {
    throw new Error('Voucher is missing');
  }

  return requestCardsUsingVoucher({
    pack,
    voucherEditionKey,
    userVouchers,
    accountByMint,
    connection,
    wallet,
  });
};

const requestCardsUsingVoucher = async ({
  pack,
  voucherEditionKey,
  userVouchers,
  accountByMint,
  connection,
  wallet,
}: RequestCardsUsingVoucherParams): Promise<ParsedAccount<ProvingProcess>> => {
  if (!wallet.publicKey) {
    throw new WalletNotConnectedError();
  }

  const { mint: voucherMint } = userVouchers[voucherEditionKey];

  const voucherTokenAccount = accountByMint.get(voucherMint);
  if (!voucherTokenAccount?.pubkey) {
    throw new Error('Voucher token account is missing');
  }

  const cardsLeftToOpen = pack.info.allowedAmountToRedeem;

  await requestCards({
    userVouchers,
    pack,
    voucherEditionKey,
    connection,
    wallet,
    cardsLeftToOpen,
    tokenAccount: voucherTokenAccount.pubkey,
  });

  const provingProcessKey = await findProvingProcessProgramAddress(
    toPublicKey(pack.pubkey),
    toPublicKey(wallet.publicKey),
    toPublicKey(voucherMint),
  );

  return fetchProvingProcessWithRetry({
    provingProcessKey,
    connection,
  });
};
