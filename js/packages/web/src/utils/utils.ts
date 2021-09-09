export const cleanName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.replace(/\s+/g, '-');
};

export const getLast = <T>(arr: T[]) => {
  if (arr.length <= 0) {
    return undefined;
  }

  return arr[arr.length - 1];
};

export const getConfig = () => {
  return require('../config/app_config.json');
};

export const isPubkeyAdmin = (pubkey: any) => {
  return getConfig().admin.includes(pubkey);
};
