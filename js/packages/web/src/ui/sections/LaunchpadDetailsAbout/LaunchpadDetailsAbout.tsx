import React, { FC } from 'react'
import CN from 'classnames'

export interface LaunchpadDetailsAboutProps {
  [x: string]: any
}

export const LaunchpadDetailsAbout: FC<LaunchpadDetailsAboutProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsAboutProps) => {
  const LaunchpadDetailsAboutClasses = CN(
    `launchpad-details-about w-full max-w-full prose`,
    className
  )

  return (
    <div className={LaunchpadDetailsAboutClasses} {...restProps}>
      <p className='text-base text-gray-700'>
        The Stoned Frogs aims to become the premier Cannabis brand and manufacturer on the Solana
        blockchain. Our ultimate objective is to create in-person cannabis coffee shops all over the
        world while joining the fight for the legalisation of marijuana. Mimicking the coffeeshop is
        an online store that offers CBD products and merchandise to our global community. Holder
        benefits are immense. The coffee shop offers a revenue-sharing system for holders, based on
        the amount of NFTs staked. In addition, holders receive discounts on the online shop items.
        To ensure that the coffee shop and online shop are properly operating, we will be creating a
        Stoned Frogs Cannabis farm that will act as a warehouse for the creation, organization and
        distribution of Cannabis Products, Merchandise and other relevant resources.
        <br /> <br />
        In addition to our initiatives in the Cannabis space, we have planned for additional
        engagement ventures with our community. We will be hosting in-person Reefer Parties for
        holders and giving away Mystery Boxes for cash prizes. We are creating The Stoned Frogs
        Game, which offers a play-to-earn opportunity for holders. There is also an online
        deathmatch feature built-into the game, which creates a burning mechanism for $SEEDS. $SEEDS
        is our utility token, which will be used to purchase products at the in-person or online
        shop, betting in The Stoned Frogs Game, and much more. Holders will be able to stake their
        NFTs to earn $SEEDS daily. We will be contributing $SEEDS to charitable organizations as
        well as cannabis organizations joining the fight for the legalization of marijuana.
      </p>
    </div>
  )
}

LaunchpadDetailsAbout.defaultProps = {}

export default LaunchpadDetailsAbout
