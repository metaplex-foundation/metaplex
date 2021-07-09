declare module '@holaplex/storefront' {
  export interface Storefront {
    pubkey?: string;
  }

  export interface StorefrontConfig {
    storefront: Storefront | void;
  }

  export interface ArweaveTag {
    name: string;
    value: string;
  }
}
