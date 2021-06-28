export const cleanName = (name?: string): string | undefined => {
  if (!name) {
    return undefined;
  }

  return name.replaceAll(' ', '-');
};

export const getLast = <T>(arr: T[]) => {
  if (arr.length <= 0) {
    return undefined;
  }

  return arr[arr.length - 1];
};
