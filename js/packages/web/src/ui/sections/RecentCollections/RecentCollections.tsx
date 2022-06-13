import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, SectionHeading } from '@oyster/common'
import { BlockCarousel, PrevButton, NextButton } from '../BlockCarousel'
import { CollectionView } from '../../../hooks/useCollections'
import CollectionCard from './CollectionCard'
import { Link } from 'react-router-dom'

export interface RecentCollectionsProps {
  className: string
  liveCollections: any[]
}

export const RecentCollections: FC<RecentCollectionsProps> = ({
  className,
  liveCollections,
  ...restProps
}) => {
  const RecentCollectionsClasses = CN(`recent-collections w-full`, className)
  const [currentSlide, setCurrentSlide] = useState<any>('isFirst')

  if (!Array.isArray(liveCollections)) {
    liveCollections = [liveCollections]
  }

  const slides = (liveCollections || []).map((collection: any) => {
    if (collection) {
      return {
        id: collection.collection,
        Component: (
          <Link to={`/collection/${collection.collection}`} key={collection.collection}>
            <CollectionCard collection={collection} />
          </Link>
        ),
      }
    } else {
      return <></>
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
              <Link to={`/discover`}>
                <Button
                  appearance='ghost'
                  view='outline'
                  iconAfter={<i className='ri-arrow-right-s-line' />}>
                  Discover more collections
                </Button>
              </Link>
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
