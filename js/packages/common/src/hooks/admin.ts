import { useWallet } from '@solana/wallet-adapter-react';

export const admin = () => {
  const wallet = useWallet();

  return (
    wallet.publicKey?.toBase58() == process.env.NEXT_PUBLIC_STORE_OWNER_ADDRESS
  );
};
