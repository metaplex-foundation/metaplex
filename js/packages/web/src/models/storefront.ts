export interface StorefrontMeta {
  title: string;
  description: string;
}

export interface Storefront {
  pubkey: string;
  favicon: string;
  logo?: string;
  stylesheet: string;
  meta: StorefrontMeta;
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

type ArweaveNode = ArweaveTransaction

export interface ArweaveEdge {
  node: ArweaveNode
}

export interface ArweaveConnection {
  edges: ArweaveEdge[]
}

export interface ArweaveQueries {
  transactions: ArweaveConnection;
}

export interface ArweaveQueryResponse {
  data: ArweaveQueries;
}