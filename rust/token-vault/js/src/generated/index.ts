import { PublicKey } from '@solana/web3.js';
export * from './accounts';
export * from './errors';
export * from './instructions';
export * from './types';

/**
 * Program address
 *
 * @category constants
 * @category generated
 */
export const PROGRAM_ADDRESS = 'vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn';

/**
 * Program publick key
 *
 * @category constants
 * @category generated
 */
export const PROGRAM_ID = new PublicKey(PROGRAM_ADDRESS);
