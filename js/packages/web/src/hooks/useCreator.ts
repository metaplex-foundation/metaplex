import { StringPublicKey, pubkeyToString } from '@oyster/common';
import { useEffect, useState } from 'react';
import { getCreator } from './getData';

export const useCreator = (id?: StringPublicKey) => {
  const [creator, setCreator] = useState<any>({});
  const key = pubkeyToString(id);

  const getCreatorsAsync = async () => {
    await getCreator().then(creators => {
      if (creators && creators.length > 0) {
        const creator = creators.find(creator => creator.info.address === key);
        setCreator(creator);
      }
    });
  };

  useEffect(() => {
    if (!key) return;
    getCreatorsAsync();
  }, [id]);

  return creator;
};
