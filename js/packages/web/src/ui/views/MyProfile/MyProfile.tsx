import React, { FC, useEffect, useState } from 'react'
import CN from 'classnames'
import { Button, Image, Tag } from '@oyster/common'
import {
  ProfileCollectiblesList,
  ProfileListings,
  ProfileOffersMade,
  ProfileOffersReceived,
  ProfileSettings,
} from '../../sections'
import { useWallet } from '@solana/wallet-adapter-react'
import { getProfile } from '../../../api'
import { useParams } from 'react-router-dom'

export interface MyProfileProps {
  [x: string]: any
}

export const MyProfile: FC<MyProfileProps> = ({ className, ...restProps }) => {
  const MyProfileClasses = CN(`my-profile w-full`, className)
  const [activeTab, setActiveTab] = useState<any>('collections')
  const [heading, setHeading] = useState<any>('My Collections')
  const [tag, setTag] = useState<any>(null)
  const [profileImage, setProfileImage] = useState<string | null>('')
  const [isProfileUpdated, setIsProfilUpdated] = useState<boolean>(false)
  const [isOtherAccount, setIsOtherAccount] = useState<boolean>(false)
  const { publicKey } = useWallet()
  const { id } = useParams<{ id: string }>()

  const userPubKey = id || publicKey?.toBase58()

  const address = `${userPubKey?.substring(0, 13)}...${userPubKey?.substring(
    userPubKey.length - 5
  )}`

  useEffect(() => {
    if (id && publicKey && publicKey.toBase58() !== id) {
      setIsOtherAccount(true)
      getProfile(id)
        .then(res => {
          setProfileImage(res.data.image)
        })
        .catch((error: any) => {
          console.log(error.message)
        })
    } else if (publicKey) {
      setIsOtherAccount(false)
      getProfile(publicKey.toBase58())
        .then(res => {
          setProfileImage(res.data.image)
        })
        .catch((error: any) => {
          console.log(error.message)
        })
    }
  }, [id])

  useEffect(() => {
    if (isProfileUpdated && userPubKey) {
      getProfile(userPubKey)
        .then(res => {
          setProfileImage(res.data.image)
        })
        .catch((error: any) => {
          console.log(error.message)
        })
    }
  }, [isProfileUpdated])

  return (
    <div className={MyProfileClasses} {...restProps}>
      <div className='container flex gap-[48px] pt-[40px] pb-[100px]'>
        <div className='sidebar w-[260px] flex-shrink-0'>
          <div className='flex w-full overflow-hidden rounded-[12px]'>
            <Image src={profileImage ? profileImage : '/img/profile-pic.png'} />
          </div>

          <div className='flex flex-col gap-[12px] pt-[12px]'>
            <Button
              isRounded={false}
              appearance={activeTab === 'collections' ? 'neutral' : 'ghost'}
              view={activeTab === 'collections' ? 'solid' : 'outline'}
              className='w-full text-left'
              onClick={() => {
                setActiveTab('collections')
                setHeading('My Collections')
              }}>
              {isOtherAccount ? 'Collections' : 'My Collections'}
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'listings' ? 'neutral' : 'ghost'}
              view={activeTab === 'listings' ? 'solid' : 'outline'}
              className='w-full text-left'
              onClick={() => {
                setActiveTab('listings')
                setHeading('My Listings')
              }}>
              Listings
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'offers-made' ? 'neutral' : 'ghost'}
              view={activeTab === 'offers-made' ? 'solid' : 'outline'}
              className='w-full text-left'
              onClick={() => {
                setActiveTab('offers-made')
                setHeading('Offers Made')
                setTag('0 Offers')
              }}>
              Offers Made
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'offers-received' ? 'neutral' : 'ghost'}
              view={activeTab === 'offers-received' ? 'solid' : 'outline'}
              className='w-full text-left'
              onClick={() => {
                setActiveTab('offers-received')
                setHeading('Offers Received')
                setTag('0 Offers')
              }}>
              Offers Received
            </Button>

            <Button
              isRounded={false}
              appearance={activeTab === 'settings' ? 'neutral' : 'ghost'}
              view={activeTab === 'settings' ? 'solid' : 'outline'}
              className='w-full text-left'
              onClick={() => {
                setActiveTab('settings')
                setHeading(isOtherAccount ? 'Profile' : 'Settings')
                setTag(null)
              }}>
              {isOtherAccount ? 'Profile' : 'Settings'}
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
              <span className='text-md font-500'>{address}</span>
              <span>
                <i className='ri-file-copy-line' />
              </span>
            </div>
          </div>

          <div className='flex w-full flex-col'>
            {activeTab === 'collections' && <ProfileCollectiblesList setTag={setTag} />}
            {activeTab === 'listings' && <ProfileListings setTag={setTag} />}
            {activeTab === 'offers-made' && <ProfileOffersMade setTag={setTag} />}
            {activeTab === 'offers-received' && <ProfileOffersReceived setTag={setTag} />}
            {activeTab === 'settings' && (
              <ProfileSettings profileupdate={setIsProfilUpdated} profileImage={setProfileImage} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
