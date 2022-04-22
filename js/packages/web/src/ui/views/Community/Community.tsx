import React, { FC } from 'react'
import CN from 'classnames'
import { SectionHeading, SocialCard } from '@oyster/common'

export interface CommunityProps {
  [x: string]: any
}

export const Community: FC<CommunityProps> = ({ className, ...restProps }: CommunityProps) => {
  const CommunityClasses = CN(`community w-full`, className)

  return (
    <div className={CommunityClasses} {...restProps}>
      <div className='flex flex-col items-center justify-center gap-[40px] pt-[80px]'>
        <SectionHeading
          commonClassName='!flex items-center !justify-center !text-center w-full'
          headingClassName='text-display-md'
          heading='Karmaplexers'
          description='The Karmaplex community is a globally distributed home to developers, token holders, validators, and members supporting the protocol.'
          descriptionClassName='!text-md max-w-[440px]'
        />
      </div>

      <div className='container pt-[80px] pb-[100px]'>
        <ul className='grid grid-cols-4 gap-[32px]'>
          <SocialCard
            icon={<i className='ri-discord-fill' />}
            label='Discord'
            description='~50,000 Members'
          />
          <SocialCard
            icon={<i className='ri-twitter-fill' />}
            label='Twitter'
            description='~50,000 Members'
          />
          <SocialCard
            icon={<i className='ri-reddit-fill' />}
            label='Reddit'
            description='~50,000 Members'
          />
          <SocialCard
            icon={<i className='ri-telegram-fill' />}
            label='Telegram'
            description='~50,000 Members'
          />
          <SocialCard
            icon={<i className='ri-instagram-fill' />}
            label='Instagram'
            description='~50,000 Members'
          />
          <SocialCard
            icon={<i className='ri-youtube-fill' />}
            label='Youtube'
            description='~50,000 Members'
          />
        </ul>
      </div>
    </div>
  )
}

export default Community
