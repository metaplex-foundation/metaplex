import { StringPublicKey } from '@oyster/common';
import { useEffect, useState } from 'react';
import { getMetdataByCreator } from './getData';

export const useCreatorArts = (id?: StringPublicKey) => {
  const [filtered, setFiltered] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    getMetdataByCreator(id)
      .then(metadata => {
        setLoading(false);
        if (metadata && metadata.length > 0) {
          setFiltered(metadata);
        }
      })
      .then(() => {});
  }, [id]);
  console.log(loading);
  return { artwork: filtered, isLoading: loading };
};
