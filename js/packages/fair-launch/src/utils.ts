import * as anchor from "@project-serum/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

export interface AnchorProgram {
  id: anchor.web3.PublicKey,
  connection: anchor.web3.Connection;
  program: anchor.Program;
}

export const toDate = (value?: anchor.BN) => {
  if(!value) {
    return;
  }

  return new Date(value.toNumber() * 1000);
};

const numberFormater = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNumber = {
  format: (val?: number) => {
    if (!val) {
      return '--';
    }

    return numberFormater.format(val);
  },
  asNumber: (val?: anchor.BN) => {
    if(!val) {
      return undefined;
    }

    return val.toNumber() / LAMPORTS_PER_SOL;
  },
};
