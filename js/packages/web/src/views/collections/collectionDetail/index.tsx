import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Banner } from '../../../components/Banner';
import { pubkeyToString, useMeta } from '@oyster/common';
import { useExtendedArt } from '../../../hooks';
import { SalesListView } from '../../home/components/SalesList';

export const CollectionDetailView = () => {
  const { id } = useParams<{ id: string }>();
  const key = pubkeyToString(id);
  const { metadataByCollection } = useMeta();
  const pubkey = useMemo(
    () => metadataByCollection[key].pubkey,
    [key, metadataByCollection],
  );
  const { ref, data } = useExtendedArt(pubkey);

  return (
    <>
      <div ref={ref} className={'collection-banner'}>
        <Banner
          src={data?.image ?? ''}
          headingText={data?.name ?? ''}
          subHeadingText={data?.description ?? ''}
          useBannerBg
        />
      </div>
      <SalesListView collectionMintFilter={key} />
    </>
  );
};
