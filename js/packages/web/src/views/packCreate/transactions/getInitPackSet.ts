import { initPackSet } from '@oyster/common';
import { TransactionInstruction } from '@solana/web3.js';
import { BN } from 'bn.js';

import { GetInitPackSetParams } from './interface';

const stringToUint8Array = (str: string, size: number): Uint8Array => {
  const array = new Uint8Array(size);

  [...str].forEach((char, index) => (array[index] = char.charCodeAt(0)));

  return array;
};

export const getInitPackSet = async ({
  data,
  packSetKey,
  walletPublicKey,
}: GetInitPackSetParams): Promise<TransactionInstruction> => {
  const {
    name,
    uri,
    description,
    mutable,
    allowedAmountToRedeem: allowedAmountToRedeemNumber,
    redeemStartDate: momentRedeemStartDate,
    redeemEndDate: momentRedeemEndDate,
    distributionType,
  } = data;

  const allowedAmountToRedeem = new BN(allowedAmountToRedeemNumber);
  const redeemStartDate = momentRedeemStartDate
    ? new BN(momentRedeemStartDate.valueOf())
    : null;
  const redeemEndDate = momentRedeemEndDate
    ? new BN(momentRedeemEndDate.valueOf())
    : null;

  return initPackSet({
    name: stringToUint8Array(name, 32),
    description,
    uri,
    mutable,
    distributionType,
    allowedAmountToRedeem,
    redeemStartDate,
    redeemEndDate,
    packSetKey,
    authority: walletPublicKey.toBase58(),
  });
};
