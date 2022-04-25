import BN from 'bn.js';

export enum TupleNumericType {
  U8 = 1,
  U16 = 2,
  U32 = 4,
  U64 = 8,
}

export const getBNFromData = (data: Uint8Array, offset: number, dataType: TupleNumericType): BN => {
  switch (dataType) {
    case TupleNumericType.U8:
      return new BN(data[offset], 'le');
    case TupleNumericType.U16:
      return new BN(data.slice(offset, offset + 2), 'le');
    case TupleNumericType.U32:
      return new BN(data.slice(offset, offset + 4), 'le');
    case TupleNumericType.U64:
      return new BN(data.slice(offset, offset + 8), 'le');
  }
};
