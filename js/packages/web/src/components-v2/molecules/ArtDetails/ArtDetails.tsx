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
        <span className='absolute top-0 bottom-0 left-0 right-0 flex items-center justify-center text-B-400 z-[300] bg-white'>
          <Spinner width={40} height={40} />
        </span>
      )}

      <div className='flex w-full'>
        <div className='flex w-[300px] h-[300px] rounded-[8px] overflow-hidden flex-shrink-0 bg-gray-100'>
          <img
            src={artImage}
            className='object-cover object-center w-full h-full'
            onError={() => setArtImage('/img/art-placeholder.jpg')}
          />
        </div>

        <div className='flex pl-[32px] flex-col w-full'>
          <div className='flex flex-col mb-[12px]'>
            <span className='text-lg text-gray-800 font-500'>{name}</span>
            <span className='text-gray-600 text-md'>
              Owned by <a className='cursor-pointer text-B-400 font-500'>@kasun.peiris</a>
            </span>
          </div>

          <div className='flex flex-col mb-[20px]'>
            <label className='text-gray-800 text-h6 mb-[4px]'>Current price</label>

            <div className='flex gap-[4px] items-center'>
              <i className='text-lg text-B-400 ri-price-tag-3-fill' />
              <span className='text-gray-800 text-lg font-500 mr-[8px]'>{price} SOL</span>
              <span className='text-base text-gray-500'>{dollarValue}</span>
            </div>
          </div>

          <NftDetailsTab />
        </div>
      </div>

      <div className='flex w-full gap-[20px] py-[40px] relative px-[32px]'>
        <button className='appearance-none text-base border border-B-400 bg-B-400 hover:bg-B-500 text-white font-500 h-[48px] px-[16px] rounded-[8px] w-full transition-colors relative z-[200]'>
          Buy Now
        </button>

        <button className='appearance-none text-base border border-B-400 hover:bg-B-400 text-B-400 hover:text-white font-500 h-[48px] px-[16px] rounded-[8px] w-full transition-colors relative z-[200]'>
          Make offer
        </button>

        <div className='absolute flex left-0 right-0 top-[32px] justify-between z-[100]'>
          <button
            className='bg-white flex items-center justify-center w-[60px] h-[60px] shadow-lg rounded-full ml-[-60px] hover:bg-B-400 hover:text-white text-gray-600 pr-[4px]'
            onClick={() => setIsLoading(true)}>
            <LeftIcon />
          </button>

          <button
            className='bg-white flex items-center justify-center w-[60px] h-[60px] shadow-lg rounded-full mr-[-60px] hover:bg-B-400 hover:text-white text-gray-600 pl-[4px]'
            onClick={() => setIsLoading(true)}>
            <RightIcon />
          </button>
        </div>
      </div>

      <div className='flex flex-col w-full py-[20px]'>
        <div className='flex justify-center w-full border-b border-gray-100'>
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
