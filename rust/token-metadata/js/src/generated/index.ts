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
export const PROGRAM_ADDRESS = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

/**
 * Program publick key
 *
 * @category constants
 * @category generated
 */
export const PROGRAM_ID = new PublicKey(PROGRAM_ADDRESS);
