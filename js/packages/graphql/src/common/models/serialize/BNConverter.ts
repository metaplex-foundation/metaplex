import BN from 'bn.js';

export const BNConverter = {
  afterSerialize(data?: BN) {
    return data?.toString('hex');
  },
  beforeDeserialize(val?: string) {
    return val ? new BN(val, 'hex') : null;
  },
};
