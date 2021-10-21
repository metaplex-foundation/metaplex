import { clusterApiUrl, Connection } from "@solana/web3.js";

export type ENV =
  | 'mainnet-beta'
  | 'mainnet-beta (Solana)'
  | 'mainnet-beta (Serum)'
  | 'testnet'
  | 'devnet'
  | 'localnet'
  | 'lending';

export const ENDPOINTS = [
  {
    name: 'mainnet-beta' as ENV,
    endpoint: 'https://api.metaplex.solana.com/',
    // ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'mainnet-beta (Solana)' as ENV,
    endpoint: 'https://api.mainnet-beta.solana.com',
    // ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'mainnet-beta (Serum)' as ENV,
    endpoint: 'https://solana-api.projectserum.com/',
    // ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'testnet' as ENV,
    endpoint: clusterApiUrl('testnet'),
    // ChainId: ChainId.Testnet,
  },
  {
    name: 'devnet' as ENV,
    endpoint: clusterApiUrl('devnet'),
    // ChainId: ChainId.Devnet,
  },
];

export const createDevNetConnection = () => {
    return new Connection(ENDPOINTS[3].endpoint, 'recent');
}