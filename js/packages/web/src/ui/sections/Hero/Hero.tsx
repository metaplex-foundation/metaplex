import React, { FC } from 'react'
import CN from 'classnames'
import { Button, MetaChip, BidCard } from '@oyster/common'

export interface HeroProps {
  [x: string]: any
}

export const Hero: FC<HeroProps> = ({ className, ...restProps }: HeroProps) => {
  const HeroClasses = CN(`hero w-full`, className)

  return (
    <div className={HeroClasses} {...restProps}>
      <div className='container flex items-center gap-[48px]'>
        <div className='hero__left flex max-w-[527px] flex-col gap-[52px]'>
          <div className='flex flex-col gap-[24px]'>
            <h1 className='text-display-xl'>
              Buy, Sell, <AndIcon /> Trade Eco-Friendly NFTs
            </h1>
            <p>
              Karmaverse is a Solana NFT exchange that rewards users for their activity and donates
              a portion of every trade to charitable causes.
            </p>
          </div>

          <div className='hero__actions flex items-center gap-[12px]'>
            <Button
              appearance='primary'
              size='lg'
              iconAfter={<i className='ri-arrow-right-s-line' />}>
              Discover Collections
            </Button>
            <Button
              appearance='ghost'
              size='lg'
              iconAfter={<i className='ri-arrow-right-s-line' />}>
              Learn More
            </Button>
          </div>
        </div>

        <div className='hero__center group relative ml-auto flex h-[452px] w-[395px]'>
          <BidCard
            className='absolute left-[-44px] right-0 m-auto w-[320px] rotate-[-6deg] shadow transition-all group-hover:rotate-[-8deg]'
            avatar='https://images.unsplash.com/photo-1511485977113-f34c92461ad9?crop=faces&fit=crop&h=200&w=200'
            avatarLabel='8bSR11...GtR63S'
            image='https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Fwww.arweave.net%2F60XHAzcLzJwkbveI7d8JM8MZWaa9D8zi4qWkHFRStDk%3Fext%3Dpng&w=1920&q=75'
            remainingTime='20h : 35m : 08s'
            price='Ⓞ 0.25 SOL'
            dollarValue='$154.00'
            onClickButton={() => {}}
          />

          <BidCard
            className='absolute left-0 right-0 m-auto w-[320px] rotate-[10deg] shadow transition-all group-hover:rotate-[0]'
            avatar='https://images.unsplash.com/photo-1511485977113-f34c92461ad9?crop=faces&fit=crop&h=200&w=200'
            avatarLabel='8bSR11...GtR63S'
            image='https://solanart.io/_next/image?url=https%3A%2F%2Fcdn-image.solanart.io%2Funsafe%2F600x600%2Ffilters%3Aformat(webp)%2Farweave.net%2FyytjymgHK5Y64dJLHZlkCB-zbayUpAmLNB49VapL30g&w=1920&q=75'
            remainingTime='20h : 35m : 08s'
            price='Ⓞ 0.25 SOL'
            dollarValue='$154.00'
            onClickButton={() => {}}
            hasIndicator
          />
        </div>

        <div className='hero__right flex flex-col gap-[28px] pr-[64px]'>
          <MetaChip heading='12.1M+' description='NFTs minted' />
          <MetaChip heading='2000+' description='Talented artists' />
          <MetaChip
            heading={`<span class="text-[24px]">Ⓞ</span> 2,398+`}
            description='Daily SOL volume'
          />
        </div>
      </div>
    </div>
  )
}

const AndIcon = () => (
  <svg
    className='mx-[4px] inline-flex'
    width='50'
    height='38'
    viewBox='0 0 50 38'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'>
    <path
      d='M49.0599 24.04V24.82C49.0599 27.38 48.3799 29.86 47.0199 32.26C46.4599 33.3 45.7799 34.2 44.9799 34.96C44.1799 35.68 43.0999 36.3 41.7399 36.82C40.3799 37.34 38.8599 37.6 37.1799 37.6C32.7799 37.6 28.6799 36.2 24.8799 33.4C23.6399 35 22.0999 36.1 20.2599 36.7C18.4599 37.26 16.2999 37.54 13.7799 37.54C11.2599 37.54 9.05991 37.14 7.17991 36.34C5.33991 35.54 3.87991 34.52 2.79991 33.28C1.75991 32 0.999912 30.58 0.519912 29.02C0.0799122 27.42 -0.0400879 25.86 0.159912 24.34C0.399912 22.82 0.979912 21.38 1.89991 20.02C2.81991 18.62 4.11991 17.44 5.79991 16.48C7.47991 15.52 9.51991 14.98 11.9199 14.86C11.7199 13.78 11.6199 12.8 11.6199 11.92C11.6199 8.64001 12.7999 5.94001 15.1599 3.82001C17.5199 1.70001 20.5999 0.640015 24.3999 0.640015C28.2399 0.640015 31.0799 1.50002 32.9199 3.22001C34.7999 4.94001 35.7399 6.94001 35.7399 9.22001C35.7399 11.5 34.8399 13.42 33.0399 14.98C31.2799 16.5 28.9199 17.26 25.9599 17.26L25.6599 16.3C26.6599 15.94 27.4599 15 28.0599 13.48C28.6599 11.96 28.9599 10.24 28.9599 8.32001C28.9599 4.00001 27.3999 1.84001 24.2799 1.84001C22.9199 1.84001 21.8199 2.38001 20.9799 3.46001C20.1399 4.50001 19.7199 5.94001 19.7199 7.78001C19.7199 9.58001 20.2799 11.88 21.3999 14.68C22.7599 18.12 24.9799 21.38 28.0599 24.46C29.5799 20.98 31.5999 18.64 34.1199 17.44C36.6799 16.2 39.3399 16.04 42.0999 16.96C43.4999 17.44 44.5799 18.32 45.3399 19.6C46.0999 20.88 46.1999 22.2 45.6399 23.56C45.0799 24.92 44.2399 25.84 43.1199 26.32C41.9999 26.76 40.8999 26.76 39.8199 26.32C38.7399 25.88 37.9799 25.3 37.5399 24.58C37.1399 23.82 36.9399 23.12 36.9399 22.48C36.9399 20.72 36.5799 19.68 35.8599 19.36C34.7799 18.92 33.6399 19.26 32.4399 20.38C31.2799 21.5 30.1999 23.24 29.1999 25.6C32.7999 29 36.3399 30.7 39.8199 30.7C41.2199 30.7 42.4399 30.48 43.4799 30.04C44.5599 29.56 45.3599 29 45.8799 28.36C46.9999 26.96 47.6199 25.76 47.7399 24.76L47.8599 24.04H49.0599ZM9.75991 27.34C10.5199 29.02 11.7399 30.56 13.4199 31.96C15.1399 33.36 16.9199 34.2 18.7599 34.48C20.6399 34.72 22.2799 34.04 23.6799 32.44C22.0399 31.12 20.4399 29.56 18.8799 27.76C15.3999 23.88 13.1599 19.96 12.1599 16C10.5999 16.96 9.55991 18.48 9.03991 20.56C8.51991 22.6 8.75991 24.86 9.75991 27.34Z'
      fill='#040D1F'
    />
  </svg>
)

export default Hero
