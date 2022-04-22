import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, Image, Tag } from '@oyster/common'
import {
  ProfileCollectiblesList,
  ProfileListings,
  ProfileOffersMade,
  ProfileOffersReceived,
  ProfileSettings,
} from '../../sections'

export interface MyProfileProps {
  [x: string]: any
}

export const MyProfile: FC<MyProfileProps> = ({ className, ...restProps }: MyProfileProps) => {
  const MyProfileClasses = CN(`my-profile w-full`, className)
  const [activeTab, setActiveTab] = useState<any>('settings')
  const [heading, setHeading] = useState<any>('Settings')
  const [tag, setTag] = useState<any>('8 NFTs')

  return (
    <div className={MyProfileClasses} {...restProps}>
      <div className='container flex gap-[48px] pt-[40px] pb-[100px]'>
        <div className='sidebar w-[260px] flex-shrink-0'>
          <div className='flex w-full overflow-hidden rounded-[12px]'>
            <Image src='/img/profile-pic.png' />
          </div>

          <div className='flex flex-col gap-[12px] pt-[12px]'>
            <Button
              isRounded={false}
              appearance={activeTab === 'collectibles' ? 'neutral' : 'ghost'}
              view={activeTab === 'collectibles' ? 'solid' : 'outline'}
              contentClassName='w-full text-left'
              onClick={() => {
                setActiveTab('collectibles')
                setHeading('My Collectibles')
                setTag('8 NFTs')
              }}>
              My Collectibles
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'listings' ? 'neutral' : 'ghost'}
              view={activeTab === 'listings' ? 'solid' : 'outline'}
              contentClassName='w-full text-left'
              onClick={() => {
                setActiveTab('listings')
                setHeading('My Listings')
                setTag('2 Collections')
              }}>
              Listings
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'offers-made' ? 'neutral' : 'ghost'}
              view={activeTab === 'offers-made' ? 'solid' : 'outline'}
              contentClassName='w-full text-left'
              onClick={() => {
                setActiveTab('offers-made')
                setHeading('Offers Made')
                setTag('6 Offers')
              }}>
              Offers Made
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'offers-received' ? 'neutral' : 'ghost'}
              view={activeTab === 'offers-received' ? 'solid' : 'outline'}
              contentClassName='w-full text-left'
              onClick={() => {
                setActiveTab('offers-received')
                setHeading('Offers Received')
                setTag('6 Offers')
              }}>
              Offers Received
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'settings' ? 'neutral' : 'ghost'}
              view={activeTab === 'settings' ? 'solid' : 'outline'}
              contentClassName='w-full text-left'
              onClick={() => {
                setActiveTab('settings')
                setHeading('Settings')
                setTag(null)
              }}>
              Settings
            </Button>
          </div>
        </div>

        <div className='flex w-full flex-col'>
          <div className='mb-[40px] flex w-full items-center justify-between'>
            <div className='flex items-center gap-[8px]'>
              <h2 className='text-h3'>{heading}</h2>
              {tag && <Tag>{tag}</Tag>}
            </div>

            <div className='flex items-center gap-[4px]'>
              <span className='text-md font-500'>AUQwXJGYXVqyc....CekHG</span>
              <span>
                <i className='ri-file-copy-line' />
              </span>
            </div>
          </div>

          <div className='flex w-full flex-col'>
            {activeTab === 'collectibles' && <ProfileCollectiblesList />}
            {activeTab === 'listings' && <ProfileListings />}
            {activeTab === 'offers-made' && <ProfileOffersMade />}
            {activeTab === 'offers-received' && <ProfileOffersReceived />}
            {activeTab === 'settings' && <ProfileSettings />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
