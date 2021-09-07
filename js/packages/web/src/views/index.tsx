// export { HomeView } from './home';
// export { ArtView } from './art';
// export { ArtCreateView } from './artCreate';
// export { ArtistView } from './artist';
// export { ArtistsView } from './artists';
// export { AuctionView } from './auction';
// export { AuctionCreateView } from './auctionCreate';
// export { ArtworksView } from './artworks';
// export { AnalyticsView } from './analytics';

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
//   const cachedContent = {"program":{"uuid":"3QtfG4","config":"3QtfG4vd5Mc8EeGqKfB8pj6XgPEzSQtdWjM6S9BcNDKE"},"items":{"0":{"link":"https://arweave.net/sljjQatlHVBsTEL4-Q0_bXsCymgQ1VVLcJdmqyqHOlM","name":"Ape #1","onChain":true},"1":{"link":"https://arweave.net/FNQvRkqdsPdPlZ39QkpRGXiFqA7TIoXGqq616D5Ge_A","name":"Ape #2","onChain":true}}};
//   const cachedContent = {"program":{"uuid":"HaLFAG","config":"HaLFAGRK2NuhmKbFR2ojWui8rSwVkoyrbpWvQqXGvMSM"}};
//   const cachedContent = {"program":{"uuid":"8NevM3","config":"8NevM3oBW6AYBNwzSfoGsYMMutdArsLgCu3yL8XcaRo4"}}; 
//   const cachedContent = {"program":{"uuid":"HooLoQ","config":"HooLoQud4DTUK9hqKJuA6DSfkoUkdY8dfyqqSEwNmvkh"},"items":{"0":{"link":"https://arweave.net/TBrhrf6HrdlMzuKDJhz1dWOu3ghGbPK8Prd-faREAtg","name":"Shotgun #1","onChain":true},"1":{"link":"https://arweave.net/2sHPjeKQ9wyPUOtdwLGzKIuhEOGy246L_z2_GA-m49A","name":"Shotgun #2","onChain":true},"2":{"link":"https://arweave.net/Pxq7YfpBVUTtdx-l3tLFUZ9I2gTXKiz9tLItfJVCPEY","name":"Shotgun #3","onChain":true}}};
  // const cachedContent = {"program":{"uuid":"2PMZYT","config":"2PMZYTEFFYrDy8FMAH7tMGQBKJezeJHG2NZbqjuXev7Z"},"items":{"0":{"link":"https://arweave.net/G8IrFEBKoCflCAl5P5KvN5vcrag6fSJL9dG7vQFpvQI","name":"Shotgun #1","onChain":true},"1":{"link":"https://arweave.net/pdw4j9lvbK2IA0h8R5VAivxooCDORugqxAZEaeOEXSM","name":"Shotgun #2","onChain":true},"2":{"link":"https://arweave.net/Cmj-_myi0fT0QBBfeCGr_qTmlrN6WrX8oHUR10RoP4Y","name":"Shotgun #3","onChain":true}}};
  // const cachedContent = {"program":{"uuid":"Ey1Xmw","config":"Ey1XmwXxUSppQZ3FmdztWJyywQwdtC3fEYmGyhwSSezi"},"items":{"0":{"link":"https://arweave.net/-wimB3DxgOZhvTZbagK1HwcdnfmhPxDt9Cz4TnCNfmg","name":"Baby Sol Punk #0","onChain":true},"1":{"link":"https://arweave.net/7WIb59f4poOnwEgn0V3MFzLm9orJupXCyGHkLg-9zgo","name":"Baby Sol Punk #1","onChain":true},"2":{"link":"https://arweave.net/Pp2IT8X1eeYuBYDWC3Q5GqUdr3QAhdO_lOpSTsLtziI","name":"Baby Sol Punk #2","onChain":true},"3":{"link":"https://arweave.net/UODTWDrqhKkt-Gsp9KdbQXsNlIA8hbgoK_0TQ7WQOWM","name":"Baby Sol Punk #3","onChain":true},"4":{"link":"https://arweave.net/nV4MHHIwzKRX0pbgwuy-e0UyOkHcYyLX985o626T6HY","name":"Baby Sol Punk #4","onChain":true},"5":{"link":"https://arweave.net/9qDDjetPGZpM1x9BqUy4eUyaHUL0EAfjAT4hK8gmzek","name":"Baby Sol Punk #5","onChain":true},"6":{"link":"https://arweave.net/Gu76FIh7A47msCFHQZZ76MyOrYfEUgpFnNfr57042kU","name":"Baby Sol Punk #6","onChain":true},"7":{"link":"https://arweave.net/wyZH5H2TvDbPDNi6Kv2j-7TLWJxp6MRAVNlIz8mJtxk","name":"Baby Sol Punk #7","onChain":true},"8":{"link":"https://arweave.net/plJpReLe0mtOE3WwKpLZk6bDVPz0I5TFIfrX65RsJyg","name":"Baby Sol Punk #8","onChain":true},"9":{"link":"https://arweave.net/Bi8d6fT1wjA1aCjXv4TLrw-xKvl1rbLlZPvLR2Wi_YY","name":"Baby Sol Punk #9","onChain":true},"10":{"link":"https://arweave.net/e7E-sp1U9wHgYC5s3U47DtZdeE0zR53Fk5KaUpilhn8","name":"Baby Sol Punk #10","onChain":true},"11":{"link":"https://arweave.net/dHgh78ZXumxE8lbN797pJb0sy1bqcsQofMBH2CsP2cQ","name":"Baby Sol Punk #11","onChain":true}}};
  // const cachedContent = {"program":{"uuid":"Ey1Xmw","config":"Ey1XmwXxUSppQZ3FmdztWJyywQwdtC3fEYmGyhwSSezi"}};
  const cachedContent = {"program":{"uuid":"9z1CVh","config":"9z1CVhdxHWdvu5r6ZeJbkKNyedkBPCqzckVcx1heNZxS"},"items":{"0":{"link":"https://arweave.net/ynsggZ4LlTl7Gq6-h4vnZX8OlkwVhXOAqKmxRh-lonM","name":"Baby Sol Punk #0","onChain":true},"1":{"link":"https://arweave.net/3TavhhzvF3fFwDeGnNQ-SPxO6vxr4QpqekkIcRkPAPE","name":"Baby Sol Punk #1","onChain":true},"2":{"link":"https://arweave.net/QinXmiUeoTj8C5xdnI4SBAI-OqD--5tbeVGdZ-9lrjk","name":"Baby Sol Punk #2","onChain":true}}};

  const mint = async ({wallet, connection}: {wallet: WalletContextState, connection: Connection}) => {
    // Set price here to the same you specified when setting up candy mashine
    const priceDoc = 0.00511;
    const priceFoush = 0.01022;
    const priceTotal = 0.01533;
    const lamportsDoc =  priceDoc * LAMPORTS_PER_SOL;
    const lamportsFoush =  priceFoush * LAMPORTS_PER_SOL;
    const lamportsTotal =  priceTotal * LAMPORTS_PER_SOL;

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
          // web3.SystemProgram.transfer({
          //   fromPubkey: wallet.publicKey,
          //   toPubkey: new web3.PublicKey('FPW4NJ82iA1UGoW8FTLYJu47FdG7DZJ4AuuSpYPoMhT5'),
          //   lamports: lamportsTotal,
          // }),
          web3.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new web3.PublicKey('FPW4NJ82iA1UGoW8FTLYJu47FdG7DZJ4AuuSpYPoMhT5'),
            lamports: lamportsFoush,
          }),
          web3.SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new web3.PublicKey('JAUPCTCny5dco34NRQQ2JDLCyUot6euTShsAxk83uqWr'),
            lamports: lamportsDoc,
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