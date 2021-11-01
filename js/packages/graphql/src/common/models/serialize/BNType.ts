import BN from 'bn.js';

export function serializeBN(data?: BN | null) {
  return data?.toString('hex') ?? null;
}

export function deserializeBN(data: string) {
  return new BN(data, 'hex');
}
