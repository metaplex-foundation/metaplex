import logger from "../../../logger";
import { decodeSafetyDeposit, decodeVault, VaultKey } from "../../actions";
import { VAULT_ID, AccountInfoOwnerString } from "../../utils";
import { ProcessAccountsFunc } from "./types";

export const processVaultData: ProcessAccountsFunc = async (
  { account, pubkey },
  setter
) => {
  if (!isVaultAccount(account)) return;

  try {
    if (isSafetyDepositBoxV1Account(account)) {
      const safetyDeposit = decodeSafetyDeposit(account.data);
      await setter("safetyDepositBoxes", pubkey, safetyDeposit);
    }
    if (isVaultV1Account(account)) {
      const vault = decodeVault(account.data);

      await setter("vaults", pubkey, vault);
    }
  } catch (err) {
    logger.warn(err);
  }
};

const isVaultAccount = (account: AccountInfoOwnerString<Buffer>) =>
  account.owner === VAULT_ID;

const isSafetyDepositBoxV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === VaultKey.SafetyDepositBoxV1;

const isVaultV1Account = (account: AccountInfoOwnerString<Buffer>) =>
  account.data[0] === VaultKey.VaultV1;
