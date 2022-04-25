import test from 'tape';

export * from './accounts';
export * from './address-labels';
export * from './asserts';
export * from './log';
export * from './token';
export * from './transactions';
export * from './vault-asserts';

export function killStuckProcess() {
  test.onFinish(() => process.exit(0));
}
