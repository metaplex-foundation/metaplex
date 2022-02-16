import CN from 'classnames';
import { Link } from 'react-router-dom';
import { BlockCarousel } from '../../molecules/BlockCarousel';
import { NftCard } from '../../molecules/NftCard';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { useEffect, useState, FC } from 'react';
import { useMeta } from '../../../contexts';

import { ArtworkViewState } from '../../../views/artworks/types';
import { useItems } from '../../../views/artworks/hooks/useItems';
import { useUserAccounts } from '@oyster/common';
// import { useExtendedArt } from '../../../hooks/useArt';

export interface RecentCollectionsCarouselProps {
  [x: string]: any;
}

export const RecentCollectionsCarousel: FC<RecentCollectionsCarouselProps> = ({
  className,
  ...restProps
}: RecentCollectionsCarouselProps) => {
  const RecentCollectionsCarouselClasses = CN(
    `recent-collections-carousel`,
    className,
  );

  ////
  const { connected } = useWallet();
  const { pullItemsPage, isFetching, pullAllMetadata } = useMeta();
  const { userAccounts } = useUserAccounts();

  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);

  const userItems = useItems({ activeKey });

  useEffect(() => {
    if (!isFetching) {
      pullItemsPage(userAccounts);
      pullAllMetadata();
    }
  }, [isFetching]);

  useEffect(() => {
    if (connected) {
      setActiveKey(ArtworkViewState.Metaplex);
    } else {
      setActiveKey(ArtworkViewState.Metaplex);
    }
  }, [connected, setActiveKey]);

  // const getMoreData = id => {
  //   const { ref, data } = useExtendedArt(id);
  //   return data;
  // };

  const slidesList = (userItems || []).map((item: any) => ({
    Component: () => (
      <Link to={``}>
        <NftCard
          {...{
            name: item?.info?.data?.symbol,
            description: item?.info?.data?.name,
            itemsCount: 1, //hardcoded
            floorPrice: 100, //hardcoded
            isVerified: 1,
            image: item?.info?.data?.uri,
          }}
        />
      </Link>
    ),
  }));
  ////////
  return (
    <div className={RecentCollectionsCarouselClasses} {...restProps}>
      <div className="container flex flex-col gap-[40px]">
        <h2 className="text-gray-800 text-h3">Recently listed collections</h2>

        <div className="flex items-center w-full">
          <div className="relative left-[-40px]">
            <button className="cursor-pointer appearance-none recent-collections-carousel--prev ml-[-25px] text-gray-300 hover:text-gray-700">
              <svg
                width="25"
                height="44"
                viewBox="0 0 25 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M23 42L3 22L23 2"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <BlockCarousel
            id="recent-collections-carousel"
            options={{
              slidesPerView: 4,
              autoPlay: { delay: 3000 },
              loop: false,
              breakpoints: {
                // when window width is >= 320px
                375: {
                  slidesPerView: 2,
                  spaceBetween: 20,
                },
                // when window width is >= 768px
                768: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                },
                // when window width is >= 1264px
                1170: {
                  slidesPerView: 4,
                  spaceBetween: 40,
                },
              },
            }}
            prevButton={'.recent-collections-carousel--prev'}
            nextButton={'.recent-collections-carousel--next'}
            slides={slidesList}
          />

          <div className="relative right-[-40px]">
            <button className="cursor-pointer appearance-none recent-collections-carousel--next mr-[-25px] text-gray-300 hover:text-gray-700">
              <svg
                width="25"
                height="44"
                viewBox="0 0 25 44"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 2L22 22L2 42"
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentCollectionsCarousel;
