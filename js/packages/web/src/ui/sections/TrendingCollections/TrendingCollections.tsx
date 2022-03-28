import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SectionHeading } from '@oyster/common'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'
import { CollectionView } from '../../../hooks/useCollections'
import CollectionCard from '../RecentCollections/CollectionCard'
import { Link } from 'react-router-dom'

export interface TrendingCollectionsProps {
  liveCollections: CollectionView[]
  className: string
}

export const TrendingCollections: FC<TrendingCollectionsProps> = ({
  className,
  liveCollections,
}) => {
  const TrendingCollectionsClasses = CN(`trending-collections w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  const slides = (liveCollections || []).map((collection: any, index: number) => {
    return {
      id: 0,
      Component: () => (
        <Link to={`/collection/${collection.mint}`} key={index}>
          <CollectionCard collection={collection} />
        </Link>
      ),
    }
  })

  return (
    <div className={TrendingCollectionsClasses}>
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
          <div className='flex w-full'>
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
