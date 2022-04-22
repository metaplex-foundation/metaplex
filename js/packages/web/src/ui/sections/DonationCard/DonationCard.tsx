import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Button, TextField, Modal } from '@oyster/common'
import { QuickDonate } from '../QuickDonate'

export interface DonationCardProps {
  [x: string]: any
}

export const DonationCard: FC<DonationCardProps> = ({
  className,
  ...restProps
}: DonationCardProps) => {
  const DonationCardClasses = CN(
    `donation-card w-[498px] h-[338px] px-[40px] py-[40px] rounded-[12px] bg-white  shadow-card`,
    className
  )

  const [amount, setAmount] = useState<any>()
  const [showQuickDonate, setShowQuickDonate] = useState(false)

  return (
    <div className={DonationCardClasses} {...restProps}>
      <div className='flex flex-col gap-[24px]'>
        <h5 className='text-h5 font-500 text-gray-800'>Donate</h5>

        <div className='grid grid-cols-4 gap-[4px]'>
          <Button
            onClick={() => {
              setAmount(10)
            }}
            appearance='ghost'
            view='outline'
            size='md'
            className={CN('h-[48px] rounded-[4px] px-[4px] hover:bg-gray-700 hover:text-white', {
              'bg-gray-700 !text-white': amount == 10,
            })}>
            10.00 USD
          </Button>
          <Button
            onClick={() => {
              setAmount(50)
            }}
            appearance='ghost'
            view='outline'
            size='md'
            className={CN('h-[48px] rounded-[4px] px-[4px] hover:bg-gray-700 hover:text-white', {
              'bg-gray-700 !text-white': amount == 50,
            })}>
            50.00 USD
          </Button>
          <Button
            onClick={() => {
              setAmount(100)
            }}
            appearance='ghost'
            view='outline'
            size='md'
            className={CN('h-[48px] rounded-[4px] px-[4px] hover:bg-gray-700 hover:text-white', {
              'bg-gray-700 !text-white': amount == 100,
            })}>
            100.00 USD
          </Button>
          <Button
            onClick={() => {
              setAmount(1000)
            }}
            appearance='ghost'
            view='outline'
            size='md'
            className={CN('h-[48px] rounded-[4px] px-[4px] hover:bg-gray-700 hover:text-white', {
              'bg-gray-700 !text-white': amount == 1000,
            })}>
            1000.00 USD
          </Button>
        </div>

        <TextField label='Email' placeholder='ex. john@example.com' />
        <Button
          appearance='primary'
          size='lg'
          className='w-full rounded-[8px]'
          onClick={() => setShowQuickDonate(true)}>
          Donate
        </Button>
      </div>

      {showQuickDonate && (
        <Modal
          size='sm'
          heading='You are donating $50.00'
          onClose={() => setShowQuickDonate(false)}
          onClickOverlay={() => setShowQuickDonate(false)}>
          <QuickDonate amount='$50.00' />
        </Modal>
      )}
    </div>
  )
}

DonationCard.defaultProps = {}

export default DonationCard
