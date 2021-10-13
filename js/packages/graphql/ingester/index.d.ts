export function findProgramAddressList(
  programId: string,
  seeds: [string, string, string[], string[]]
): Promise<Array<[string, string]>>;

export function getWhitelistedCreatorList(
  creators: string[],
  stores: string[],
): Promise<Array<[string, string]>>;
