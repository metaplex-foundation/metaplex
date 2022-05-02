export enum PackDistributionType {
  MaxSupply,
  Fixed,
  Unlimited,
}

export enum PackKey {
  Uninitialized,
  PackSet,
  PackCard,
  PackVoucher,
  ProvingProcess,
}

export enum PackSetState {
  NotActivated,
  Activated,
  Deactivated,
  Ended,
}
