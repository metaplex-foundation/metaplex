import { useMemo } from 'react';
import json from '../db.json';

export const DEFAULT_COLLECTION_FAMILY = 'Ninja';

export const useCollections = () => {
  return useMemo(() => {
    console.log(json.collections);
    const collections = json.collections;
    return { collections };
  }, []);
};

export const useCollection = (param?: string) => {
  let collectionData;
  json.collections.map(item => {
    if (item.id == param) {
      collectionData = item;
    }
  });
  return { collectionData };
};
