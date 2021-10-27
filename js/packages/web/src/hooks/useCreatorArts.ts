import { StringPublicKey } from '@oyster/common';
import { useEffect, useState } from 'react';
import { getMetdataByCreator } from './getData';

export const useCreatorArts = (id?: StringPublicKey) => {
  const [filtered, setFiltered] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getMetdataByCreator(id).then(metadata => {
      setLoading(false);
      if (metadata && metadata.length > 0) {
        setFiltered(metadata);
      }
    });
  }, [id]);

  return { artwork: filtered, isLoading: loading };
};
