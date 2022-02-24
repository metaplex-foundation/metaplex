import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'
import { collections } from '../../../../dummy-data/collections'
import { BlockCarousel } from '../../molecules/BlockCarousel'
import { TrendingCard } from '../../molecules/TrendingCard'

export interface TrendingCollectionsCarouselProps {
  [x: string]: any
}

export const TrendingCollectionsCarousel: FC<TrendingCollectionsCarouselProps> = ({
  className,
  ...restProps
}: TrendingCollectionsCarouselProps) => {
  const TrendingCollectionsCarouselClasses = CN(`trending-collections-carousel`, className)

  const slidesList = (collections || []).map(({ id, link, ...restProps }, index) => ({
    id: index,
    Component: () => (
      <Link to={link}>
        <TrendingCard key={id || index} {...restProps} />
      </Link>
    ),
  }))

  return (
    <div className={TrendingCollectionsCarouselClasses} {...restProps}>
      <div className='container flex flex-col gap-[40px]'>
        <h2 className='text-h3 text-gray-800'>Trending</h2>

        <div className='flex w-full items-center'>
          <div className='relative left-[-40px]'>
            <button className='trending-collections-carousel--prev ml-[-25px] cursor-pointer appearance-none text-gray-300 hover:text-gray-700'>
              <svg
                width='25'
                height='44'
                viewBox='0 0 25 44'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M23 42L3 22L23 2'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>

          <BlockCarousel
            id='trending-collections-carousel'
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
            prevButton={'.trending-collections-carousel--prev'}
            nextButton={'.trending-collections-carousel--next'}
            slides={slidesList}
          />

          <div className='relative right-[-40px]'>
            <button className='trending-collections-carousel--next mr-[-25px] cursor-pointer appearance-none text-gray-300 hover:text-gray-700'>
              <svg
                width='25'
                height='44'
                viewBox='0 0 25 44'
                fill='none'
                xmlns='http://www.w3.org/2000/svg'>
                <path
                  d='M2 2L22 22L2 42'
                  stroke='currentColor'
                  strokeWidth='4'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrendingCollectionsCarousel
