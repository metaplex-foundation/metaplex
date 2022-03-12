import React, { FC } from 'react'
import CN from 'classnames'
import { SectionHeading, DataCard, Button } from '@oyster/common'

export interface WhyUSProps {
  [x: string]: any
}

export const WhyUS: FC<WhyUSProps> = ({ className, ...restProps }: WhyUSProps) => {
  const WhyUSClasses = CN(`why-us w-full`, className)

  return (
    <div className={WhyUSClasses} {...restProps}>
      <div className='container'>
        <SectionHeading
          align='center'
          overline='✋ Why Karmaverse?'
          heading='What makes us different'
          headingClassName='pt-[12px]'
          description='Do you have a Solana based generative NFT collection with<br />more than 100 pieces? Submit your collection below to be added to our Marketplace and<br />shown to thousands of users.'
        />

        <div className='flex w-full gap-[32px] pt-[80px]'>
          <DataCard
            className='border-[1px] border-N-100'
            icon='/img/points.svg'
            overline='Donations with'
            heading='Every purchase'
            description='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
              labore et dolore magna.'
          />
          <DataCard
            className='border-[1px] border-N-100'
            icon='/img/gift.svg'
            overline='Community'
            heading='Rewards'
            description='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
              labore et dolore magna.'
          />
          <DataCard
            className='border-[1px] border-N-100'
            icon='/img/collection.svg'
            overline='Curated'
            heading='Collections'
            description='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
              labore et dolore magna.'
          />
        </div>

        <div className='flex items-center justify-center gap-[12px] pt-[80px]'>
          <Button size='lg' iconAfter={<i className='ri-arrow-right-s-line' />}>
            SUBMIT YOUR COLLECTION
          </Button>
          <Button size='lg' appearance='ghost' iconAfter={<i className='ri-arrow-right-s-line' />}>
            LEARN MORE
          </Button>
        </div>
      </div>
    </div>
  )
}

WhyUS.defaultProps = {}

export default WhyUS
