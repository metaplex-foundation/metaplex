import React, { useContext, useEffect, useState } from 'react';
import { useMeta } from '..';
import {
  CollectionContextState as CollectionsContextState,
  CollectionsState,
} from './types';
import {
  IMetadataExtension,
  ParsedAccount,
  useLocalStorage,
  Metadata,
} from '@oyster/common';
import { range } from 'lodash';

const CollectionsContext = React.createContext<CollectionsContextState>({
  tokenMetadataByCollection: {},
  isLoading: false,
  update: () => {},
});

export function CollectionsProvider({ children = null as any }) {
  const { metadata } = useMeta();
  const [state, setState] = useState<CollectionsState>({
    tokenMetadataByCollection: {},
  });
  const [isLoading, setIsLoading] = useState(true);
  const localStorage = useLocalStorage();

  const loadFileFromUri = async (uri: string) => {
    try {
      const cached = localStorage.getItem(uri);
      if (cached) {
        return JSON.parse(cached);
      } else {
        fetch(uri)
          .then(async _ => {
            try {
              const data = await _.json();
              try {
                localStorage.setItem(uri, JSON.stringify(data));
              } catch {
                // ignore
              }
              return JSON.parse(data);
            } catch {
              return undefined;
            }
          })
          .catch(() => {
            return undefined;
          });
      }
    } catch (ex) {
      console.error(ex);
    }
  };

  async function update() {
    setIsLoading(true);

    const promises = metadata.map(m => loadFileFromUri(m.info.data.uri));
    const results: Array<IMetadataExtension> = await Promise.all(promises);
    const records: Record<
      string,
      Array<{
        ParsedAccount: ParsedAccount<Metadata>;
        MetadataExtension: IMetadataExtension;
      }>
    > = {};

    for (const i of range(0, metadata.length)) {
      const metadataExtension = results[i];
      if (!metadataExtension.collection) {
        continue;
      }

      const item = metadata[i];
      records[metadataExtension.collection.name] ||= [];
      records[metadataExtension.collection.name].push({
        ParsedAccount: item,
        MetadataExtension: metadataExtension,
      });
    }

    setState({ tokenMetadataByCollection: records });
    setIsLoading(false);
  }

  useEffect(() => {
    if (metadata.length > 0) update();
  }, [metadata]);

  return (
    <CollectionsContext.Provider
      value={{
        ...state,
        update,
        isLoading,
      }}
    >
      {children}
    </CollectionsContext.Provider>
  );
}

export const useCollectionsContext = () => {
  const context = useContext(CollectionsContext);
  return context;
};
