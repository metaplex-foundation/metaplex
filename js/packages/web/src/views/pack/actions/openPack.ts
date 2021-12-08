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
import { claimPackCards } from '../transactions/claimPackCards';
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
  metadataByPackCard,
  packCards,
  masterEditions,
  connection,
  wallet,
}: OpenPackParams): Promise<void> => {
  if (!wallet.publicKey) {
    throw new WalletNotConnectedError();
  }
  if (!userVouchers[voucherEditionKey]) {
    throw new Error('Voucher is missing');
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

  const {
    info: { cardsToRedeem },
  } = await fetchProvingProcessWithRetry({
    voucherMint: toPublicKey(voucherMint),
    packKey: toPublicKey(pack.pubkey),
    walletKey: toPublicKey(wallet.publicKey),
    connection,
  });

  await claimPackCards({
    wallet,
    connection,
    voucherMint,
    cardsToRedeem,
    metadataByPackCard,
    packCards,
    masterEditions,
    pack,
  });
};

// Sometimes it requires several attempts to fetch ProvingProcess
const fetchProvingProcessWithRetry = async ({
  voucherMint,
  packKey,
  walletKey,
  connection,
}: FetchProvingProcessWithRetryParams): Promise<
  ParsedAccount<ProvingProcess>
> => {
  const provingProcessKey = await findProvingProcessProgramAddress(
    packKey,
    walletKey,
    voucherMint,
  );

  let provingProcess;
  const startTime = getUnixTs();

  while (!provingProcess && getUnixTs() - startTime < REQUEST_TIMEOUT) {
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
