import { Coder } from '@project-serum/anchor';

const idl = require('./merkle_distributor.json');
export const coder = new Coder(idl);
