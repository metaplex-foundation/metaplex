export interface TotalItem {
  key: string;
  marketSize: number;
  nativeSize: number;
  name: string;
}

export interface Totals {
  marketSize: number;
  numberOfAssets: number;
  items: TotalItem[];
}
