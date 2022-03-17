import React, { FC, useState } from 'react'
import CN from 'classnames'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'
import { LiveAuctionViewState } from '../../views/Home'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import AuctionsCard from './AuctionsCard'
import { AuctionView } from '../../../hooks'
import { ButtonGroup, Button, SectionHeading } from '@oyster/common'

export interface HottestAuctionsProps {
  activeKey: LiveAuctionViewState
  onChangeActiveKey: (key: LiveAuctionViewState) => void
  className: string
}

export const HottestAuctions: FC<HottestAuctionsProps> = ({
  className,
  activeKey,
  onChangeActiveKey,
}) => {
  const HottestAuctionsClasses = CN(`hottests-auctions w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')
  const { auctions } = useAuctionsList(activeKey)

  const slides = (auctions || []).map((auction: AuctionView, index: number) => {
    return {
      id: 0,
      Component: () => <AuctionsCard auction={auction} key={index} />,
    }
  })

  return (
    <div className={HottestAuctionsClasses}>
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
                    onClick: () => {
                      onChangeActiveKey(LiveAuctionViewState.All)
                    },
                    isActive: activeKey === LiveAuctionViewState.All,
                    hasIndicator: activeKey === LiveAuctionViewState.All,
                  },
                  {
                    label: 'Ended',
                    onClick: () => {
                      onChangeActiveKey(LiveAuctionViewState.Ended)
                    },
                    isActive: activeKey === LiveAuctionViewState.Ended,
                    hasIndicator: activeKey === LiveAuctionViewState.Ended,
                  },
                  {
                    label: 'Participated',
                    onClick: () => {
                      onChangeActiveKey(LiveAuctionViewState.Participated)
                    },
                    isActive: activeKey === LiveAuctionViewState.Participated,
                    hasIndicator: activeKey === LiveAuctionViewState.Participated,
                  },
                  {
                    label: 'My Live Auctions',
                    onClick: () => {
                      onChangeActiveKey(LiveAuctionViewState.Own)
                    },
                    isActive: activeKey === LiveAuctionViewState.Own,
                    hasIndicator: activeKey === LiveAuctionViewState.Own,
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
