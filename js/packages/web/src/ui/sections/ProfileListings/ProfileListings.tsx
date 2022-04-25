import React, { FC } from 'react'
import CN from 'classnames'
import { ListingCard } from '@oyster/common'

export interface ProfileListingsProps {
  [x: string]: any
}

export const ProfileListings: FC<ProfileListingsProps> = ({
  className,
  ...restProps
}: ProfileListingsProps) => {
  const ProfileListingsClasses = CN(`profile-listings grid grid-cols-4 gap-[28px]`, className)

  return (
    <div className={ProfileListingsClasses} {...restProps}>
      <ListingCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/ukZ3DgqeaTyx5qifyooXV-rO5CM8CjKnKFJZVlVQFaU'
        name='Belugies'
        count={2000}
        volume='472.54'
        floorPrice='Ⓞ 0.25 SOL'
        dollarValue='$154.00'
      />
      <ListingCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/LlrUIT49BxcHsSGBXmQcJ70G_jjZMgcPZJh3CxqziuA'
        name='Degen Ape #2314'
        count={2000}
        volume='472.54'
        floorPrice='Ⓞ 0.25 SOL'
        dollarValue='$154.00'
      />
    </div>
  )
}

ProfileListings.defaultProps = {}

export default ProfileListings
