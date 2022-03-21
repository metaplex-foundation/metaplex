import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SectionHeading } from '@oyster/common'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'
import { useCollections } from '../../../hooks/useCollections'
import CollectionCard from './CollectionCard'

export interface RecentCollectionsProps {
  className: string
}

export const RecentCollections: FC<RecentCollectionsProps> = ({
  className,
  ...restProps
}: RecentCollectionsProps) => {
  const RecentCollectionsClasses = CN(`recent-collections w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  const { liveCollections } = useCollections()

  const slides = (liveCollections || []).map((collection: any, index: number) => {
    return {
      id: 0,
      Component: () => <CollectionCard collection={collection} key={index} />,
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
          <div className='flex w-full'>
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
