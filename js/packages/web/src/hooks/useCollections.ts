import { useCollectionsContext } from '@oyster/common';
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
    if (item.collectionName == param) {
      collectionData = item;
    }
  });
  return { collectionData };
};

export const useCollectionTokenMetadataList = (collectionName: string) => {
  const collectionsContext = useCollectionsContext();
  return {
    collection: collectionsContext.tokenMetadataByCollection[collectionName],
    isLoading: collectionsContext.isLoading,
    update: collectionsContext.update,
  };
};
