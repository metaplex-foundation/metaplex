export interface StorefrontMeta {
  title: string;
  description: string;
  favicon: string;
}

export interface StorefrontTheme {
  logo?: string;
  stylesheet: string;
}

export interface Storefront {
  pubkey: string;
  subdomain: string;
  meta: StorefrontMeta;
  theme: StorefrontTheme;
}

export interface StorefrontConfig {
  storefront: Storefront | void;
}

export interface ArweaveTag {
  name: string;
  value: string;
}

export interface ArweaveTransaction {
  id: string;
  tags: ArweaveTag[];
}

type ArweaveNode = ArweaveTransaction;

export interface ArweaveEdge {
  node: ArweaveNode;
}

export interface ArweaveConnection {
  edges: ArweaveEdge[];
}

export interface ArweaveQueries {
  transactions: ArweaveConnection;
}

export interface ArweaveQueryResponse {
  data: ArweaveQueries;
}
