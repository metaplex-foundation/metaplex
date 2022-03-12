import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SectionHeading, BuyCard } from '@oyster/common'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'

export interface RecentCollectionsProps {
  [x: string]: any
}

const slidesData = [
  {
    name: 'Belugies',
    volume: '472.54',
    image: '/img/temp/nft12.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Mean Pigs',
    volume: '472.54',
    image: '/img/temp/nft9.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Bohomia',
    volume: '472.54',
    image: '/img/temp/nft10.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
  {
    name: 'Sad Sea',
    volume: '472.54',
    image: '/img/temp/nft11.webp',
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
    name: 'Pixel Wizards at Hogwarts',
    volume: '472.54',
    image: '/img/temp/nft8.webp',
    floorPrice: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
    link: '#',
  },
]

export const RecentCollections: FC<RecentCollectionsProps> = ({
  className,
  ...restProps
}: RecentCollectionsProps) => {
  const RecentCollectionsClasses = CN(`recent-collections w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  const slides = (slidesData || []).map((slide: any, index: number) => {
    return {
      id: 0,
      Component: () => <BuyCard key={index} onClickButton={() => {}} {...slide} />,
    }
  })

  return (
    <div className={RecentCollectionsClasses} {...restProps}>
      <div className='container flex flex-col gap-[60px]'>
        <SectionHeading
          overline='📣 Recently'
          heading='Listed collections'
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
              id='recent-collections'
              onChangeIndex={(i: any) => setCurrentSlide(i)}
            />
          </div>

          <PrevButton
            className={CN(
              'recent-collections-prev-button absolute top-[100px] left-[-61px] cursor-pointer',
              {
                hidden: currentSlide === 'isFirst',
              }
            )}
          />

          <NextButton
            className={CN(
              'recent-collections-next-button absolute top-[100px] right-[-61px] cursor-pointer',
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

export default RecentCollections
