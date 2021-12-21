import {
  decodeEdition,
  findProvingProcessProgramAddress,
  getEdition,
  ParsedAccount,
  StringPublicKey,
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
  provingProcess,
  voucherMint,
  vouchers,
  accountByMint,
  connection,
  wallet,
}: GetProvingProcessParams): Promise<ParsedAccount<ProvingProcess>> => {
  let editionMint: StringPublicKey;

  if (provingProcess) {
    editionMint = provingProcess.info.voucherMint;
  } else if (voucherMint) {
    editionMint = voucherMint;
  } else {
    throw new Error('No voucher and proving process');
  }

  const editionKey = await getEdition(editionMint);
  const editionData = await connection.getAccountInfo(toPublicKey(editionKey));

  if (!editionData) {
    throw new Error('No edition for voucher mint');
  }

  const edition = decodeEdition(editionData.data);
  const voucher = Object.values(vouchers).find(
    ({ info }) => info.master === edition.parent,
  );

  if (!voucher) {
    throw new Error('Voucher is missing');
  }

  const voucherKey = voucher.pubkey;

  const voucherTokenAccount = accountByMint.get(editionMint);

  // Calculate already requested but not redeemed cards by summing values in cardsToRedeem
  const alreadyRequestedCards = provingProcess?.info.cardsToRedeem
    ? Object.values(
        Object.fromEntries(provingProcess.info.cardsToRedeem),
      ).reduce((a, b) => a + b)
    : 0;
  const redeemedCards = provingProcess?.info.cardsRedeemed || 0;

  const cardsLeftToOpen =
    pack.info.allowedAmountToRedeem - redeemedCards - alreadyRequestedCards;

  if (cardsLeftToOpen === 0 && provingProcess) {
    return provingProcess;
  }

  return requestCardsUsingVoucher({
    pack,
    cardsLeftToOpen,
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
  cardsLeftToOpen,
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

  await requestCards({
    pack,
    voucherKey,
    editionKey,
    editionMint,
    connection,
    wallet,
    cardsLeftToOpen,
    tokenAccount: voucherTokenAccount?.pubkey,
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
