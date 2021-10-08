import { WRAPPED_SOL_MINT } from '@oyster/common';

export * from './labels';
export * from './style';

export const QUOTE_MINT = WRAPPED_SOL_MINT;

export function backendLMSAddresses (cluster: string) {
  let endpoint: string;
  // FIXME change hardcode later.
  switch (cluster) {
    case "mainnet":
      endpoint = "api2.letmespeak.pro";
      break;
    case "mainnet-beta (Solana)":
      endpoint = "api2.letmespeak.pro";
      break;
    case "mainnet-beta (Serum)":
      endpoint = "api2.letmespeak.pro";
      break;
    case "mainnet-beta":
      endpoint = "api2.letmespeak.pro";
      break;
    case "testnet":
      endpoint = "api2-dev.letmespeak.pro";
      break;
    case "devnet":
      endpoint = "api2-dev.letmespeak.pro";
      break;
    default:
      endpoint = "api2-dev.letmespeak.pro"
  }

  const registrationUrl =
    `https://${endpoint}/user/wallet_registration`;
  const loginUrl = `https://${endpoint}/user/auth`;
  const getAttributesByNftIdUrl = `https://${endpoint}/user/skills/`;

  return {
    registrationUrl,
    loginUrl,
    getAttributesByNftIdUrl
  };
}
