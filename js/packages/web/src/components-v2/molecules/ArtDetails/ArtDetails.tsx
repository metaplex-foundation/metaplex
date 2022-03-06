import React, { FC, useState, useEffect } from 'react'
import CN from 'classnames'
import { TabHighlightButton } from '../../atoms/TabHighlightButton'
import { NftDetailsTab } from '../../sections/NftDetailsTab'
import { NftActivityTable } from '../../sections/NftActivityTable'
import { NftOffersTable } from '../../sections/NftOffersTable'
import RightIcon from '../../icons/Right'
import LeftIcon from '../../icons/Left'
import Spinner from '../../icons/Spinner'

export interface ArtDetailsProps {
  [x: string]: any
}

export const ArtDetails: FC<ArtDetailsProps> = ({
  className,
  art,
  onSubmit,
  ...restProps
}: ArtDetailsProps) => {
  const ArtDetailsClasses = CN(`art-details w-full pb-[40px] relative`, className)

  const { image, name = 'Belugie #8758', price = '◎ .09', dollarValue = price } = art || {}

  const [activeTab, setActiveTab] = useState('activity')
  const [artImage, setArtImage] = useState(image)
  const [isLoading, setIsLoading] = useState(false)

  // FAKE useEffect to watch isLoading and set a timer to change isLoading to false
  // This must be changed to an actual API call
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isLoading])

  return (
    <div className={ArtDetailsClasses} {...restProps}>
      {isLoading && (
        <span className='absolute top-0 bottom-0 left-0 right-0 z-[300] flex items-center justify-center bg-white text-B-400'>
          <Spinner width={40} height={40} />
        </span>
      )}

      <div className='flex w-full'>
        <div className='flex h-[300px] w-[300px] flex-shrink-0 overflow-hidden rounded-[8px] bg-gray-100'>
          <img
            src={artImage}
            className='h-full w-full object-cover object-center'
            onError={() => setArtImage('/img/art-placeholder.jpg')}
          />
        </div>

        <div className='flex w-full flex-col pl-[32px]'>
          <div className='mb-[12px] flex flex-col'>
            <span className='text-lg font-500 text-gray-800'>{name}</span>
            <span className='text-md text-gray-600'>
              Owned by <a className='cursor-pointer font-500 text-B-400'>@kasun.peiris</a>
            </span>
          </div>

          <div className='mb-[20px] flex flex-col'>
            <label className='mb-[4px] text-h6 text-gray-800'>Current price</label>

            <div className='flex items-center gap-[4px]'>
              <i className='ri-price-tag-3-fill text-lg text-B-400' />
              <span className='mr-[8px] text-lg font-500 text-gray-800'>{price} SOL</span>
              <span className='text-base text-gray-500'>{dollarValue}</span>
            </div>
          </div>

          <NftDetailsTab />
        </div>
      </div>

      <div className='relative flex w-full gap-[20px] py-[40px] px-[32px]'>
        <button
          onClick={onSubmit}
          className='relative z-[200] h-[48px] w-full appearance-none rounded-[8px] border border-B-400 bg-B-400 px-[16px] text-base font-500 text-white transition-colors hover:bg-B-500'>
          Buy Now
        </button>

        <button className='relative z-[200] h-[48px] w-full appearance-none rounded-[8px] border border-B-400 px-[16px] text-base font-500 text-B-400 transition-colors hover:bg-B-400 hover:text-white'>
          Make offer
        </button>

        <div className='absolute left-0 right-0 top-[32px] z-[100] flex justify-between'>
          <button
            className='ml-[-60px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white pr-[4px] text-gray-600 shadow-lg hover:bg-B-400 hover:text-white'
            onClick={() => setIsLoading(true)}>
            <LeftIcon />
          </button>

          <button
            className='mr-[-60px] flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white pl-[4px] text-gray-600 shadow-lg hover:bg-B-400 hover:text-white'
            onClick={() => setIsLoading(true)}>
            <RightIcon />
          </button>
        </div>
      </div>

      <div className='flex w-full flex-col py-[20px]'>
        <div className='flex w-full justify-center border-b border-gray-100'>
          <TabHighlightButton
            isActive={activeTab === 'activity'}
            onClick={() => {
              setActiveTab('activity')
            }}>
            Activity
          </TabHighlightButton>

          <TabHighlightButton
            isActive={activeTab === 'offers'}
            onClick={() => {
              setActiveTab('offers')
            }}>
            Offers
          </TabHighlightButton>
        </div>

        <div className='flex pt-[28px]'>
          {activeTab === 'activity' && <NftActivityTable />}
          {activeTab === 'offers' && <NftOffersTable />}
        </div>
      </div>
    </div>
  )
}

export default ArtDetails
