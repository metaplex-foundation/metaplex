import React, { FC } from 'react';
import { CollectionHeader } from '../../sections/CollectionHeader';
import { CollectionBody } from '../../sections/CollectionBody';

export interface CollectionProps {
  [x: string]: any;
}

export const Collection: FC<CollectionProps> = () => {
  return (
    <>
      <CollectionHeader className="pb-[60px]" />
      <CollectionBody className="pb-[100px]" />
    </>
  );
};

export default Collection;
