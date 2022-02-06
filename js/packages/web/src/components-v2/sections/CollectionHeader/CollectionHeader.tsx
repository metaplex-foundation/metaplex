import React, { FC, useState } from 'react';
import CN from 'classnames';
import { Parallax } from 'react-parallax';
import { Avatar } from '../../atoms/Avatar';
import VerifiedBadge from '../../icons/VerifiedBadge';
import IdentityIcon from '../../icons/Identity';
import { StatsCard } from '../../molecules/StatsCard';

export interface CollectionHeaderProps {
  [x: string]: any;
}

export const CollectionHeader: FC<CollectionHeaderProps> = ({
  className,
  ...restProps
}: CollectionHeaderProps) => {
  const CollectionHeaderClasses = CN(`collection-header bg-white`, className);
  const [isFavorite, setIsFavorite] = useState(true);
  const [isShowFullBio, setIsShowFullBio] = useState(false);

  return (
    <div className={CollectionHeaderClasses} {...restProps}>
      <Parallax
        blur={0}
        bgImage={'/img/collection-banner.png'}
        bgImageAlt="Karmaverse"
        strength={200}
        bgClassName="!object-cover !h-[300px] !w-full"
      >
        <div className="flex w-full h-[280px]" />
      </Parallax>

      <div className="container mt-[-75px] relative z-10">
        <div className="flex">
          <Avatar
            image="https://www.arweave.net/wIzXN_oLlTdFkooye9xq383psyOgak2s2Q_43sThVps?ext=png"
            size="lg"
            hasBorder
          />
        </div>

        <div className="flex pt-[16px] w-full">
          <div className="flex flex-col">
            <h1 className="text-h2 font-600 mb-[4px]">Belugies</h1>

            <div className="flex items-center w-full gap-[16px]">
              <span className="text-B-400">Created by 0x...2ZUGLUDLEX</span>
              <VerifiedBadge width={24} height={24} />
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="appearance-none text-[24px] inline-flex items-center"
              >
                {!isFavorite ? (
                  <i className="ri-heart-line" />
                ) : (
                  <i className="text-red-400 ri-heart-fill" />
                )}
              </button>
              <IdentityIcon />
            </div>

            <div className="flex w-full max-w-[370px] text-gray-700 pt-[12px]">
              {!isShowFullBio ? (
                <p>
                  Belugies is a generative NFT collection artistically
                  illustrated by a 14 year old artist. Since its inception
                  October 16th, 2021 Belugies...
                  <a
                    onClick={() => setIsShowFullBio(!isShowFullBio)}
                    className="text-B-400 pl-[4px] cursor-pointer"
                  >
                    Read More
                  </a>
                </p>
              ) : (
                <p>
                  Belugies is a generative NFT collection artistically
                  illustrated by a 14 year old artist. Since its inception
                  October 16th, 2021 Belugies has donated $200,000.00 to
                  multiple nonprofit organizations including Beluga Whale
                  Alliance, Ocean Defenders Alliance, and Sunshine Kids children
                  with cancer foundation. Created by a young artist and her
                  family members Belugies aims to build a global community based
                  around giving back and doing good for the world. #UgieUgie
                  <a
                    onClick={() => setIsShowFullBio(!isShowFullBio)}
                    className="text-B-400 pl-[4px] cursor-pointer"
                  >
                    Show Less
                  </a>
                </p>
              )}
            </div>

            <div className="flex text-[24px] items-center gap-[16px] pt-[16px]">
              <button className="text-gray-700 transition-all appearance-none hover:text-B-400">
                <i className="ri-discord-fill" />
              </button>

              <button className="text-gray-700 transition-all appearance-none hover:text-B-400">
                <i className="ri-twitter-fill" />
              </button>

              <button className="text-gray-700 transition-all appearance-none hover:text-B-400">
                <i className="ri-global-line" />
              </button>
            </div>
          </div>

          <div className="flex ml-auto pt-[62px]">
            <div className="block">
              <StatsCard />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionHeader;
