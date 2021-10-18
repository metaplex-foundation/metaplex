// Leave for store implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getUser = async (email: string) => {
  return null;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getWalletAddress = async (user: any) => {
  return 'wallet';
};

export const saveUser = async (
  email: string,
  wallet: string,
  callback: () => void,
) => {
  callback();
};
