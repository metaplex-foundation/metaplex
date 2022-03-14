import React, { FC, useState } from 'react'
import CN from 'classnames'
import { ButtonGroup, Button, SectionHeading, BidCardAlt } from '@oyster/common'

import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'

export interface HottestsAuctionsProps {
  [x: string]: any
}

const slidesData = [
  {
    image: '/img/temp/nft1.webp',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
  {
    image: '/img/temp/nft3.webp',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
  {
    image: '/img/temp/nft4.webp',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
  {
    image: '/img/temp/nft2.png',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
  {
    image: '/img/temp/nft5.webp',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
  {
    image: '/img/temp/nft6.gif',
    remainingTime: '20h : 35m : 08s',
    price: 'Ⓞ 0.25 SOL',
    dollarValue: '$154.00',
  },
]

export const HottestsAuctions: FC<HottestsAuctionsProps> = ({
  className,
  ...restProps
}: HottestsAuctionsProps) => {
  const HottestsAuctionsClasses = CN(`hottests-auctions w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  const slides = (slidesData || []).map(
    ({ avatar, avatarLabel, image, remainingTime, price, dollarValue }: any, index: number) => {
      return {
        id: 0,
        Component: () => (
          <BidCardAlt
            key={index}
            avatar={avatar}
            avatarLabel={avatarLabel}
            image={image}
            remainingTime={remainingTime}
            price={price}
            dollarValue={dollarValue}
            onClickButton={() => {}}
          />
        ),
      }
    }
  )

  return (
    <div className={HottestsAuctionsClasses} {...restProps}>
      <div className='container flex flex-col gap-[60px]'>
        <SectionHeading
          indicator={{ children: 'Live', appearance: 'danger' }}
          overline='🔥 Hottest'
          heading={`Auctions`}
          actions={
            <div className='flex items-center gap-[12px]'>
              <ButtonGroup
                buttons={[
                  {
                    label: 'Live Auctions',
                    onClick: () => {},
                    isActive: true,
                    hasIndicator: true,
                  },
                  {
                    label: 'Ended',
                    onClick: () => {},
                  },
                  {
                    label: 'Participated',
                    onClick: () => {},
                  },
                ]}
              />
              <Button
                appearance='ghost'
                view='outline'
                iconAfter={<i className='ri-arrow-right-s-line' />}>
                View all auctions
              </Button>
            </div>
          }
        />

        <div className='relative flex w-full'>
          <div className='flex w-full overflow-hidden'>
            <BlockCarousel
              slides={slides}
              id='hottest-auctions'
              onChangeIndex={(i: any) => setCurrentSlide(i)}
            />
          </div>

          <PrevButton
            className={CN(
              'hottest-auctions-prev-button absolute top-[100px] left-[-61px] cursor-pointer',
              {
                hidden: currentSlide === 'isFirst',
              }
            )}
          />

          <NextButton
            className={CN(
              'hottest-auctions-next-button absolute top-[100px] right-[-61px] cursor-pointer',
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

export default HottestsAuctions
