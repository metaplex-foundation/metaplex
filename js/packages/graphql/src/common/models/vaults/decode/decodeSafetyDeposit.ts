import { decodeEntity } from '../../BaseEntity';
import { SafetyDepositBox } from '../entities';
import { VAULT_SCHEMA } from '../schema';

export const decodeSafetyDeposit = decodeEntity(SafetyDepositBox, VAULT_SCHEMA);
