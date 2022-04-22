import React, { FC } from 'react'
import CN from 'classnames'
import { ChevronDown } from 'react-feather'
import { SectionHeading, MetaChip, Button } from '@oyster/common'
import { Link } from 'react-router-dom'
import { IconCard } from '@oyster/common'
import { DonationCard } from '../../sections'

export interface DonationsProps {
  [x: string]: any
}

export const Donations: FC<DonationsProps> = ({ className, ...restProps }: DonationsProps) => {
  const DonationsClasses = CN(`donations container`, className)

  return (
    <div className={DonationsClasses} {...restProps}>
      <div className='flex gap-[162px] pt-[80px]'>
        <div className='flex max-w-[580px] flex-col gap-[20px]'>
          <SectionHeading
            heading='Donate to Karmaplex charities'
            headingClassName='text-display-md text-gray-900 font-400'
            description='Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'
            descriptionClassName='text-gray-700'
          />
        </div>

        <DonationCard />
      </div>

      <div className='flex gap-[80px] pt-[120px]' id='details'>
        <img
          src='https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=764&q=80'
          className='h-[370px] w-[600px] rounded-[12px] object-cover object-center'
        />
        <div className='flex max-w-[494px] flex-col gap-[20px]'>
          <h2 className='text-h2 font-600'>
            Connects nonprofits <br /> donors, and companies in <br />{' '}
            <span className='text-B-400'>every country</span>
          </h2>
          <p className='text-base text-gray-700'>
            Lorem ipsum dolor sit amet, has ad iuvaret dissentiunt, dicta adversarium sed at.
            Sapientem eloquentiam definitionem at nec, cu facilis maiorum pri, ne novum tollit his.
            Est everti aeterno tamquam ad, quo augue impetus equidem cu. No oportere forensibus eos,
            vix in nulla adipisci dissentiunt, nec ut tritani urbanitas.
          </p>
        </div>
      </div>

      <div className='grid grid-cols-4 gap-[32px] pt-[120px]'>
        <IconCard
          icon='/img/icons/food.svg'
          heading='Healthy Food'
          description='Lorem ipsum dolor sit amet, <br /> consectetur adipiscing elit'
        />
        <IconCard
          icon='/img/icons/water.svg'
          heading='Clean Water'
          description='Lorem ipsum dolor sit amet, <br /> consectetur adipiscing elit'
        />
        <IconCard
          icon='/img/icons/education.svg'
          heading='Education'
          description='Lorem ipsum dolor sit amet, <br /> consectetur adipiscing elit'
        />
        <IconCard
          icon='/img/icons/medical.svg'
          heading='Medical Help'
          description='Lorem ipsum dolor sit amet, <br /> consectetur adipiscing elit'
        />
      </div>

      <div className='flex justify-between py-[120px]'>
        <div className='flex max-w-[494px] flex-col gap-[20px]'>
          <h2 className='text-h2 font-600'>
            Transform the lives of Beluga Whales just like the Whale you are.
          </h2>
          <p className='text-base text-gray-700'>
            Lorem ipsum dolor sit amet, has ad iuvaret dissentiunt, dicta adversarium sed at.
            Sapientem eloquentiam definitionem at nec, cu facilis maiorum pri, ne novum tollit his.
            Est everti aeterno tamquam ad, quo augue impetus equidem cu. No oportere forensibus eos,
            vix in nulla adipisci dissentiunt, nec ut tritani urbanitas.
          </p>
        </div>
        <img
          src='https://images.unsplash.com/photo-1612443385720-b4181d2ab928?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'
          className='h-[370px] w-[600px] rounded-[12px] object-cover object-center'
        />
      </div>
    </div>
  )
}

export default Donations
