import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SectionHeading, BuyCard } from '@oyster/common'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'

export interface TrendingCollectionsProps {
  [x: string]: any
}

const slidesData = [
  {
    name: 'Almost Famous Pandas',
    volume: '472.54',
    image: '/img/temp/nft6.gif',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Lady Yetis',
    volume: '472.54',
    image: '/img/temp/nft5.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Diamond Hands',
    volume: '472.54',
    image: '/img/temp/nft13.gif',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Dapper Ape',
    volume: '472.54',
    image: '/img/temp/nft8.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Posh Gorilla',
    volume: '472.54',
    image: '/img/temp/nft12.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Pixel Wizards',
    volume: '472.54',
    image: '/img/temp/nft2.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
]

export const TrendingCollections: FC<TrendingCollectionsProps> = ({
  className,
  ...restProps
}: TrendingCollectionsProps) => {
  const TrendingCollectionsClasses = CN(`trending-collections w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  const slides = (slidesData || []).map((slide: any, index: number) => {
    return {
      id: 0,
      Component: () => <BuyCard key={index} onClickButton={() => {}} {...slide} />,
    }
  })

  return (
    <div className={TrendingCollectionsClasses} {...restProps}>
      <div className='container flex flex-col gap-[60px]'>
        <SectionHeading
          overline='🤠 Trending'
          heading='Collections'
          actions={
            <div className='flex items-center gap-[12px]'>
              <Button
                appearance='ghost'
                view='outline'
                iconAfter={<i className='ri-arrow-right-s-line' />}>
                Discover more collections
              </Button>
            </div>
          }
        />

        <div className='relative flex w-full'>
          <div className='flex w-full overflow-hidden'>
            <BlockCarousel
              slides={slides}
              id='trending-collections'
              onChangeIndex={(i: any) => setCurrentSlide(i)}
            />
          </div>

          <PrevButton
            className={CN(
              'trending-collections-prev-button absolute top-[100px] left-[-61px] cursor-pointer',
              {
                hidden: currentSlide === 'isFirst',
              }
            )}
          />

          <NextButton
            className={CN(
              'trending-collections-next-button absolute top-[100px] right-[-61px] cursor-pointer',
              {
                hidden: currentSlide === 'isLast',
              }
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default TrendingCollections
