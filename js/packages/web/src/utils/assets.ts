import {
  getTokenName,
  getVerboseTokenName,
  KnownTokenMap,
} from '@oyster/common';
import { TokenInfo } from '@solana/spl-token-registry';

export const LAMPORT_MULTIPLIER = 10 ** 9;
const WINSTON_MULTIPLIER = 10 ** 12;

export const filterModalSolTokens = (tokens: TokenInfo[]) => {
  return tokens;
};

export async function getAssetCostToStore(files: File[]) {
  const totalBytes = files.reduce((sum, f) => (sum += f.size), 0);
  console.log('Total bytes', totalBytes);
  const txnFeeInWinstons = parseInt(
    await (await fetch('https://arweave.net/price/0')).text(),
  );
  console.log('txn fee', txnFeeInWinstons);
  const byteCostInWinstons = parseInt(
    await (
      await fetch('https://arweave.net/price/' + totalBytes.toString())
    ).text(),
  );
  console.log('byte cost', byteCostInWinstons);
  const totalArCost =
    (txnFeeInWinstons * files.length + byteCostInWinstons) / WINSTON_MULTIPLIER;

  console.log('total ar', totalArCost);

  let conversionRates = JSON.parse(
    localStorage.getItem('conversionRates') || '{}',
  );

  if (
    !conversionRates ||
    !conversionRates.expiry ||
    conversionRates.expiry < Date.now()
  ) {
    console.log('Calling conversion rate');
    conversionRates = {
      value: JSON.parse(
        await (
          await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=solana,arweave&vs_currencies=usd',
          )
        ).text(),
      ),
      expiry: Date.now() + 5 * 60 * 1000,
    };

    if (conversionRates.value.solana)
      localStorage.setItem('conversionRates', JSON.stringify(conversionRates));
  }

  // To figure out how many lamports are required, multiply ar byte cost by this number
  const arMultiplier =
    conversionRates.value.arweave.usd / conversionRates.value.solana.usd;
  console.log('Ar mult', arMultiplier);
  // Add 10% padding for safety and slippage in price.
  // We also always make a manifest file, which, though tiny, needs payment.
  return LAMPORT_MULTIPLIER * totalArCost * arMultiplier * 1.1;
}
