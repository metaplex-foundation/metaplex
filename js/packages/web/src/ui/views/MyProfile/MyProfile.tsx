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
import { message } from 'antd'

export interface MyProfileProps {
  [x: string]: any
}

export interface IProfile {
  publicKey: string
  userName: string
  email: string
  twitterLink: string
  discordLink: string
  telegram: string
  bio: string
  image: string
}

export const MyProfile: FC<MyProfileProps> = ({ className, ...restProps }) => {
  const MyProfileClasses = CN(`my-profile w-full`, className)
  const [activeTab, setActiveTab] = useState<any>('collections')
  const [heading, setHeading] = useState<any>('My Collections')
  const [tag, setTag] = useState<any>(null)
  const [profile, setProfile] = useState<IProfile>()
  const [isProfileUpdated, setIsProfilUpdated] = useState<boolean>(false)
  const { publicKey } = useWallet()

  const address = `${publicKey?.toBase58()?.substring(0, 13)}...${publicKey
    ?.toBase58()
    ?.substring(publicKey?.toBase58().length - 5)}`

  useEffect(() => {
    if (publicKey) {
      getProfile(publicKey.toBase58())
        .then(res => {
          const profile: IProfile = {
            publicKey: res.data.public_key,
            userName: res.data.user_name,
            email: res.data.email,
            twitterLink: res.data.twitter_link,
            discordLink: res.data.discord_link,
            telegram: res.data.telegram,
            bio: res.data.bio,
            image: res.data.image,
          }
          setProfile(profile)
        })
        .catch(() => {
          message.error('Error with get profile information')
        })
    }
  }, [])

  if (isProfileUpdated && publicKey) {
    getProfile(publicKey.toBase58())
      .then(res => {
        const profile: IProfile = {
          publicKey: res.data.public_key,
          userName: res.data.user_name,
          email: res.data.email,
          twitterLink: res.data.twitter_link,
          discordLink: res.data.discord_link,
          telegram: res.data.telegram,
          bio: res.data.bio,
          image: res.data.image,
        }
        setProfile(profile)
        setIsProfilUpdated(false)
      })
      .catch(() => {
        message.error('Error with get profile information')
      })
  }

  return (
    <div className={MyProfileClasses} {...restProps}>
      <div className='container flex gap-[48px] pt-[40px] pb-[100px]'>
        <div className='sidebar w-[260px] flex-shrink-0'>
          <div className='flex w-full overflow-hidden rounded-[12px]'>
            <Image src={profile?.image ? profile.image : '/img/profile-pic.png'} />
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
              My Collections
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
                setTag('6 Offers')
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
                setTag('6 Offers')
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
              <span className='text-md font-500'>{address}</span>
              <span>
                <i className='ri-file-copy-line' />
              </span>
            </div>
          </div>

          <div className='flex w-full flex-col'>
            {activeTab === 'collections' && <ProfileCollectiblesList setTag={setTag} />}
            {activeTab === 'listings' && <ProfileListings setTag={setTag} />}
            {activeTab === 'offers-made' && <ProfileOffersMade />}
            {activeTab === 'offers-received' && <ProfileOffersReceived />}
            {activeTab === 'settings' && (
              <ProfileSettings profile={profile} profileupdate={setIsProfilUpdated} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyProfile
