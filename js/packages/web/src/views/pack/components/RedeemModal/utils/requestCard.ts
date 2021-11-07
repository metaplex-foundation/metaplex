import { toPublicKey } from '@oyster/common';
import { getProvingProcessByPubkey } from '@oyster/common/dist/lib/models/packs/accounts/ProvingProcess';
import {
  findPackCardProgramAddress,
  findProvingProcessProgramAddress,
} from '@oyster/common/dist/lib/models/packs/find';
import { sendRequestCard } from '../transactions/requestCard';

export const requestCard = async ({
  userVouchers,
  pack,
  editionId,
  tokenAccount,
  connection,
  wallet,
}): Promise<{ packCardToRedeem: string; packCardToRedeemIndex: number }> => {
  const {
    pubkey: packVoucher,
    edition,
    mint: editionMint,
  } = userVouchers[editionId];

  await sendRequestCard({
    connection,
    index: 1, // voucher index, currently we have only one
    packSetKey: pack.pubkey,
    edition,
    editionMint,
    tokenAccount,
    packVoucher,
    wallet,
  });

  const provingProcessKey = await findProvingProcessProgramAddress(
    toPublicKey(pack.pubkey),
    toPublicKey(editionMint),
  );
  const provingProcessData = await getProvingProcessByPubkey(
    connection,
    provingProcessKey,
  );

  const packCardToRedeemIndex = provingProcessData.data.nextCardToRedeem;
  const packCardToRedeem = await findPackCardProgramAddress(
    toPublicKey(pack.pubkey),
    packCardToRedeemIndex,
  );

  return { packCardToRedeem, packCardToRedeemIndex };
};
