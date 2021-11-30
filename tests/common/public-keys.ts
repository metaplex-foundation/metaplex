// prettier-ignore
export const PUBLIC_KEYS= {
  "prog:token_metadata" :  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
  "prog:token_vault"    :  "vau1zxA2LbssAUEF7Gpw91zMM1LvXrvpzJtmZ58rPsn",
  "prog:auction"        :  "auctxRXPeJoc4817jDhf4HbjnhEcr1cCXenosMhK5R8",
  "prog:metaplex"       :  "p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98",
  "prog:nft_packs"      :  "packFeFNZzMfD9aVWL7QbGz1WcU7R9zpf6pvNsw2BLu",
  "acc:test_creator"    :  "2noq8fVotDZm55ZRb7upVgKSXC5E4RH2hEHcRtNpPjGM",
  "acc:store_owner"     :  "A15Y2eoMNGeX4516TYTaaMErwabCrf9AB9mrzFohdQJz",
  "acc:store"           :  "7jBKuCC1i113dbWmncVP8L5pV7FbS8sVmFYdGoptxAGa",
  "acc:creator_alice"   :  "GaVtHDjxYeAThQjgrLPJ88sKCm9P9KC9ixJppzCVzZJ",
  "acc:creator_bob"     :  "4xa5SRzvEBr5z1rd9WNNXjRx1oDfkNob1coy1hUk4kyy",
} as const;

export type TestKey = keyof typeof PUBLIC_KEYS;
export type TestPublicKey = typeof PUBLIC_KEYS[TestKey];

// prettier-ignore
export const LABELS: Record<TestKey, string> = {
  "prog:token_metadata" : "Metaplex Token Metadata",
  "prog:token_vault"    : "Metaplex Token Vault",
  "prog:auction"        : "Metaplex Auction",
  "prog:metaplex"       : "Metaplex",
  "prog:nft_packs"      : "Metaplex NFT Packs",
  "acc:test_creator"    : "Test Creator",
  "acc:store_owner"     : "Store Owner",
  "acc:store"           : "Store",
  "acc:creator_alice"   : "Creator Alice",
  "acc:creator_bob"     : "Creator Bob",
};

export const PUBKEY_TO_LABEL = Object.entries(LABELS).reduce(
  (acc: Record<TestPublicKey, string>, entry) => {
    const key: TestKey = entry[0] as TestKey;
    const label = entry[1];
    const pubkey = PUBLIC_KEYS[key];
    acc[pubkey] = label;
    return acc;
  },
  {} as Record<TestPublicKey, string>
);
