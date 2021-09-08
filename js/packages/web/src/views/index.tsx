// export { HomeView } from './home';
export { ArtView } from './art';
export { ArtCreateView } from './artCreate';
export { ArtistView } from './artist';
export { ArtistsView } from './artists';
export { AuctionView } from './auction';
export { AuctionCreateView } from './auctionCreate';
export { ArtworksView } from './artworks';
export { AnalyticsView } from './analytics';

import { Layout, Button } from 'antd';
import React, { createContext, useCallback, useContext }  from 'react';
// import { useConnection, useWalletModal } from '@oyster/common';
import { useWallet, WalletContextState } from '@solana/wallet-adapter-react';

import { Provider, Program, web3 } from '@project-serum/anchor';
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import { MintLayout, Token } from '@solana/spl-token';
import {
  TokenInfo,
  TokenListProvider,
  ENV as ChainId,
} from '@solana/spl-token-registry';

export interface WalletModalContextState {
  visible: boolean;
  setVisible: (open: boolean) => void;
}

export const WalletModalContext = createContext<WalletModalContextState>(
  {} as WalletModalContextState,
);

export function useWalletModal(): WalletModalContextState {
  return useContext(WalletModalContext);
}

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
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'mainnet-beta (Solana)' as ENV,
    endpoint: 'https://api.mainnet-beta.solana.com',
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'mainnet-beta (Serum)' as ENV,
    endpoint: 'https://solana-api.projectserum.com/',
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'testnet' as ENV,
    endpoint: clusterApiUrl('testnet'),
    ChainId: ChainId.Testnet,
  },
  {
    name: 'devnet' as ENV,
    endpoint: clusterApiUrl('devnet'),
    ChainId: ChainId.Devnet,
  },
];

const DEFAULT = ENDPOINTS[0].endpoint;

interface ConnectionConfig {
  connection: Connection;
  endpoint: string;
  env: ENV;
  setEndpoint: (val: string) => void;
  tokens: TokenInfo[];
  tokenMap: Map<string, TokenInfo>;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  endpoint: DEFAULT,
  setEndpoint: () => {},
  connection: new Connection(DEFAULT, 'recent'),
  env: ENDPOINTS[0].name,
  tokens: [],
  tokenMap: new Map<string, TokenInfo>(),
});

export function useConnection() {
  return useContext(ConnectionContext).connection as Connection;
}

const CANDY_MACHINE = 'candy_machine';

const programId = new web3.PublicKey(
  'cndyAnrLdpjq1Ssp1z8xxDsB8dxe7u4HL5Nxi2K5WXZ',
);
const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new web3.PublicKey(
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
const TOKEN_PROGRAM_ID = new web3.PublicKey(
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);
const getTokenWallet = async function (wallet: web3.PublicKey, mint: web3.PublicKey) {
  return (
    await web3.PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    )
  )[0];
};

export function createAssociatedTokenAccountInstruction(
  associatedTokenAddress: web3.PublicKey,
  payer: web3.PublicKey,
  walletAddress: web3.PublicKey,
  splTokenMintAddress: web3.PublicKey,
) {
  const keys = [
    {
      pubkey: payer,
      isSigner: true,
      isWritable: true,
    },
    {
      pubkey: associatedTokenAddress,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: walletAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: splTokenMintAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new web3.TransactionInstruction({
    keys,
    programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

const getCandyMachine = async (config: web3.PublicKey, uuid: string) => {
  return await PublicKey.findProgramAddress(
    [Buffer.from(CANDY_MACHINE), config.toBuffer(), Buffer.from(uuid)],
    programId,
  );
};

const getMetadata = async (
  mint: web3.PublicKey,
): Promise<web3.PublicKey> => {
  return (
    await web3.PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

const getMasterEdition = async (
  mint: web3.PublicKey,
): Promise<web3.PublicKey> => {
  return (
    await PublicKey.findProgramAddress(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID,
    )
  )[0];
};

export const HomeView = () => {
  const wallet = useWallet();
  const connection = useConnection();

  const { setVisible } = useWalletModal();
  const connect = useCallback(
    () => (wallet.wallet ? wallet.connect().catch() : setVisible(true)),
    [wallet.wallet, wallet.connect, setVisible],
  );

  // This is from the .cache directory after uploading, copy yours here without "items"
  // const cachedContent = {"program":{"uuid":"DnKRU4","config":"DnKRU47C9gph7MNjbqZk1jVtj8DbZnDdHPNnZfHMajpD"},"items":{"0":{"link":"https://arweave.net/Gs956KEwNwszUPgTOZOZ7QdJZfZ_jVZvLNhPPCActMA","name":"Baby Sol Punk #0","onChain":true},"1":{"link":"https://arweave.net/lGHSnYywcTSLplqo3DatX2nd4vmXpAMbsOrHoTNL0NY","name":"Baby Sol Punk #1","onChain":true},"2":{"link":"https://arweave.net/V2A6Zj-yB4OxPiVT3l13mxTbIj00w-vTXbNSTX6_O2g","name":"Baby Sol Punk #2","onChain":true},"3":{"link":"https://arweave.net/EKOT66f4JmnJ7OXYHCIqS-jnO0TSwqJ6fty5bre8zvo","name":"Baby Sol Punk #3","onChain":true},"4":{"link":"https://arweave.net/-LzKnt1mVum2146-Xotjp1rPq5JqwTydIXhqmgBEnPI","name":"Baby Sol Punk #4","onChain":true},"5":{"link":"https://arweave.net/UuAu_S2Ma4pynGrEnE7mjGO9EujnaS0NTLCv6hzAcO0","name":"Baby Sol Punk #5","onChain":true},"6":{"link":"https://arweave.net/JZsFZT-VO7OmJBBx6d95yX1Yra3m0XgrvsAMA6TKLEw","name":"Baby Sol Punk #6","onChain":true},"7":{"link":"https://arweave.net/OlbzHlt0x5bai9E8UtslMC3FGA35Vjxqi1kSrZyZGTw","name":"Baby Sol Punk #7","onChain":true},"8":{"link":"https://arweave.net/XGeU26pS4_8o0tJdlvY6j-2x5NWVSz6WKV5w1dThxFk","name":"Baby Sol Punk #8","onChain":true},"9":{"link":"https://arweave.net/ikduKXrKJsSkmZuSh6HECXFk590Y3wCrsuU8KJn9UCk","name":"Baby Sol Punk #9","onChain":true}}};
  // const cachedContent = {"program":{"uuid":"EM1fUL","config":"EM1fULUw9ZB7dAJ8kCknCBw975PsxAqq57t2cpPj2ziR"}};
  // const cachedContent = {"program":{"uuid":"X7K9jP","config":"X7K9jPHtXdUU4bDKp1n47Tmqe5Az7stBjC3ExvZz2Hq"}}; 
  // const cachedContent = {"program":{"uuid":"6jk4wx","config":"6jk4wxGGiwntsZZyg6cJZeCe7udYvzTtgLvaYudNtgWc"}};
  const cachedContent = {"program":{"uuid":"Frwys6","config":"Frwys6zs1TxaBhmwQQGrgSQHCTdxZVaac7vuEARrMeaT"}};

  const mint = async ({wallet, connection}: {wallet: WalletContextState, connection: Connection}) => {
    // Set price here to the same you specified when setting up candy mashine
    // const priceTotal = 1.5;
    // const lamportsTotal =  priceTotal * LAMPORTS_PER_SOL;

    const mint = web3.Keypair.generate();

    if (wallet && wallet.wallet && wallet.publicKey) {
      const token = await getTokenWallet(wallet.publicKey, mint.publicKey);
      const provider = new Provider(connection, {
        ...wallet.wallet,
        signAllTransactions: wallet.signAllTransactions,
        signTransaction: wallet.signTransaction,
        publicKey: wallet.publicKey
      }, {
        preflightCommitment: 'recent',
      });
      const idl = await Program.fetchIdl(programId, provider);
      const anchorProgram = new Program(idl, programId, provider);
      const config = new web3.PublicKey(cachedContent.program.config);
      const [candyMachine, bump] = await getCandyMachine(
        config,
        cachedContent.program.uuid,
      );

      const candy = await anchorProgram.account.candyMachine.fetch(candyMachine);

      if ((candy as any)?.itemsRedeemed?.toNumber() - (candy as any)?.data?.itemsAvailable?.toNumber() === 0) {
        alert('All NFTs have been sold');
      }

      const metadata = await getMetadata(mint.publicKey);
      const masterEdition = await getMasterEdition(mint.publicKey);
      const tx = await anchorProgram.rpc.mintNft({
        accounts: {
          config: config,
          candyMachine: candyMachine,
          payer: wallet.publicKey,
          //@ts-ignore
          wallet: candy.wallet,
          mint: mint.publicKey,
          metadata,
          masterEdition,
          mintAuthority: wallet.publicKey,
          updateAuthority: wallet.publicKey,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent:SYSVAR_RENT_PUBKEY,
          clock:SYSVAR_CLOCK_PUBKEY,
        },
        signers: [mint],
        instructions: [
          web3.SystemProgram.createAccount({
            fromPubkey: wallet.publicKey,
            newAccountPubkey: mint.publicKey,
            space: MintLayout.span,
            lamports: await provider.connection.getMinimumBalanceForRentExemption(
              MintLayout.span,
            ),
            programId: TOKEN_PROGRAM_ID,
          }),
          Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            wallet.publicKey,
            wallet.publicKey,
          ),
          createAssociatedTokenAccountInstruction(
            token,
            wallet.publicKey,
            wallet.publicKey,
            mint.publicKey,
          ),
          Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            token,
            wallet.publicKey,
            [],
            1,
          ),
        ],
      });
    } 
  }

  return (
    <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
      <Button type="primary" className="app-btn" onClick={ () => !wallet.connected  ? connect() : mint({wallet, connection})}>
        {!wallet.connected ? 'Connect' : 'Mint'} 
      </Button>{' '}
    </Layout>
  );
};