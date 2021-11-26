import {
  findProvingProcessProgramAddress,
  getUnixTs,
  ParsedAccount,
  sleep,
  toPublicKey,
} from '@oyster/common';
import {
  getProvingProcessByPubkey,
  ProvingProcess,
} from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';

import { requestCards } from '../transactions/requestCards';
import {
  FetchProvingProcessWithRetryParams,
  OpenPackParams,
} from './interface';

const SLEEP_TIMEOUT = 500;
const REQUEST_TIMEOUT = 15000;

const openPack = async ({
  pack,
  voucherEditionKey,
  userVouchers,
  accountByMint,
  connection,
  wallet,
}: OpenPackParams): Promise<void> => {
  if (!wallet.publicKey) {
    throw new WalletNotConnectedError();
  }
  if (!userVouchers[voucherEditionKey]) {
    throw new Error('Voucher is missing');
  }

  const { mint: editionMint } = userVouchers[voucherEditionKey];

  const voucherTokenAccount = accountByMint.get(editionMint);
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

  // Have some waiting time
  await fetchProvingProcessWithRetry({
    editionMint: toPublicKey(editionMint),
    packKey: toPublicKey(pack.pubkey),
    walletKey: toPublicKey(wallet.publicKey),
    connection,
  });
};

// Sometimes it requires several attempts to fetch ProvingProcess
const fetchProvingProcessWithRetry = async ({
  editionMint,
  packKey,
  walletKey,
  connection,
}: FetchProvingProcessWithRetryParams): Promise<
  ParsedAccount<ProvingProcess>
> => {
  const provingProcessKey = await findProvingProcessProgramAddress(
    packKey,
    walletKey,
    editionMint,
  );

  let provingProcess;

  const startTime = getUnixTs();
  const shouldFetchAgain =
    !provingProcess && getUnixTs() - startTime < REQUEST_TIMEOUT;

  while (shouldFetchAgain) {
    try {
      provingProcess = await getProvingProcessByPubkey(
        connection,
        provingProcessKey,
      );
    } catch {
      // skip
    }

    await sleep(SLEEP_TIMEOUT);
  }

  return provingProcess;
};

export default openPack;
