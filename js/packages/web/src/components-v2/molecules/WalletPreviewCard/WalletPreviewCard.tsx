import React, { FC } from 'react'
import CN from 'classnames'
import AvatarPreview from 'boring-avatars'

import { trimWalletAddress } from '../../../utils/trimWalletAddress'

import SolanaIcon from '../../icons/Solana'

export interface WalletPreviewCardProps {
  [x: string]: any
}

export const WalletPreviewCard: FC<WalletPreviewCardProps> = ({
  className,
  ...restProps
}: WalletPreviewCardProps) => {
  const WalletPreviewCardClasses = CN(`wallet-preview-card`, className)

  return (
    <div className={WalletPreviewCardClasses} {...restProps}>
      <div className='flex w-full flex-col items-center justify-center gap-[8px] border-b border-gray-100 p-[16px]'>
        <AvatarPreview
          size={40}
          name='Mary Edwards'
          variant='ring'
          colors={['#005cc1', '#69a5ff', '#ffffff', '#004796', '#00336b', '#00336b']}
        />

        <div className='flex items-center gap-[4px] text-gray-700'>
          <span className='cursor-pointer hover:text-B-400'>
            <i className='ri-file-copy-fill' />
          </span>

          <span className='text-md font-500'>
            {trimWalletAddress('13Z7Gi2BwQEZcaYp6vfgywtdSKyqrTxGBL')}
          </span>
        </div>
      </div>

      <div className='flex flex-col px-[16px] pt-[16px]'>
        <label className='text-sm font-500 uppercase'>Balance</label>

        <div className='flex items-center gap-[8px] pt-[8px]'>
          <SolanaIcon width={16} height={16} />
          <span className='text-base font-500 text-gray-900'>0.95 SOL</span>
          <span className='text-md'>$106.27</span>
        </div>
      </div>

      <div className='flex gap-[8px] p-[16px]'>
        <button className='h-[32px] w-full appearance-none rounded-[4px] bg-B-400 px-[12px] text-md font-600 text-white hover:bg-B-500'>
          Add Funds
        </button>
        <button className='h-[32px] w-full appearance-none rounded-[4px] bg-gray-100 px-[12px] text-md font-500 text-gray-800 hover:bg-gray-200'>
          Disconnect
        </button>
      </div>
    </div>
  )
}

export default WalletPreviewCard
