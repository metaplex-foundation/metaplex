import React, { FC } from 'react'
import CN from 'classnames'
import { Image } from '@oyster/common'

export interface ProfileOffersReceivedProps {
  [x: string]: any
}

const offersList = [
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/yytjymgHK5Y64dJLHZlkCB-zbayUpAmLNB49VapL30g',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/ukZ3DgqeaTyx5qifyooXV-rO5CM8CjKnKFJZVlVQFaU',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/LlrUIT49BxcHsSGBXmQcJ70G_jjZMgcPZJh3CxqziuA',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/2HQvY0wYkzabT-3qzFZX-MpECFLFEXX1NhptwjZ98Jw',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/HYGi_EMu8Dhu9cWHaIBdJW0DPJkaZnDr0yJIMy5hlak',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
  {
    image:
      'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/-00FUjXIBBOHmnp8v_li6uklY_vfrwR5FvVeVHjdpAM',
    title: 'Degen Ape #1921',
    owner: '6gr...Vun5',
    price: 'Ⓞ 49.92',
    time: '12 hours ago',
  },
]

export const ProfileOffersReceived: FC<ProfileOffersReceivedProps> = ({
  className,
  ...restProps
}: ProfileOffersReceivedProps) => {
  const ProfileOffersReceivedClasses = CN(
    `profile-offers-received flex flex-col gap-[8px]`,
    className
  )

  return (
    <div className={ProfileOffersReceivedClasses} {...restProps}>
      <div className='grid w-full cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-[8px] py-[4px] px-[4px] text-md font-500 text-slate-500 hover:bg-slate-50'>
        <div className='flex items-center gap-[8px]'>
          <span className='font-500'>NFT</span>
        </div>
        <span>Price</span>
        <span>From</span>
        <span>Date</span>
      </div>

      {offersList.map(({ image, title, price, owner, time }: any, index: number) => (
        <div
          key={index}
          className='grid w-full cursor-pointer grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-[8px] rounded-[8px] border border-slate-200 bg-white py-[4px] px-[4px] text-md hover:bg-slate-50'>
          <div className='flex items-center gap-[8px]'>
            <div className='flex h-[40px] w-[40px] overflow-hidden rounded-[8px]'>
              <Image src={image} />
            </div>
            <span className='font-500'>{title}</span>
          </div>
          <span>{price}</span>
          <span>{owner}</span>
          <span>{time}</span>
        </div>
      ))}
    </div>
  )
}

ProfileOffersReceived.defaultProps = {}

export default ProfileOffersReceived
