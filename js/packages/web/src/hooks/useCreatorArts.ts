import { StringPublicKey } from '@oyster/common';
import { useEffect, useState } from 'react';
import { getMetdataByCreator } from './getData';

let loading = true;

export const useCreatorArts = (id?: StringPublicKey) => {
  const [filtered, setFiltered] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    getMetdataByCreator(id).then(metadata => {
      if (metadata && metadata.length > 0) {
        loading = false;
        setFiltered(metadata);
      }
    });
  }, [id]);

  return { artwork: filtered, isLoading: loading };
};
