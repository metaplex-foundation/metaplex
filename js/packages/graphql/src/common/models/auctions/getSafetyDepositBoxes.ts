import { MetaState } from '../../process/types';
import { StringPublicKey } from '../../utils/ids';

export function getSafetyDepositBoxes(
  vaultId: StringPublicKey,
  safetyDepositBoxesByVaultAndIndex: MetaState['safetyDepositBoxes'],
) {
  return buildListWhileNonZero(safetyDepositBoxesByVaultAndIndex, vaultId);
}

export function buildListWhileNonZero<T>(hash: Map<string, T>, key: string) {
  const list: T[] = [];
  let ticket = hash.get(`${key}-0`);
  if (ticket) {
    list.push(ticket);
    let i = 1;
    while (ticket) {
      ticket = hash.get(`${key}-${i.toString()}`);
      if (ticket) list.push(ticket);
      i++;
    }
  }
  return list;
}
