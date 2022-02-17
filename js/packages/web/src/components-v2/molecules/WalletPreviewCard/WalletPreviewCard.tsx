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
      <div className='flex flex-col items-center justify-center w-full gap-[8px] p-[16px] border-b border-gray-100'>
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

      <div className='flex pt-[16px] px-[16px] flex-col'>
        <label className='text-sm uppercase font-500'>Balance</label>

        <div className='flex items-center gap-[8px] pt-[8px]'>
          <SolanaIcon width={16} height={16} />
          <span className='text-base text-gray-900 font-500'>0.95 SOL</span>
          <span className='text-md'>$106.27</span>
        </div>
      </div>

      <div className='flex p-[16px] gap-[8px]'>
        <button className='text-white appearance-none font-600 hover:bg-B-500 rounded-[4px] px-[12px] h-[32px] w-full bg-B-400 text-md'>
          Add Funds
        </button>
        <button className='text-gray-800 appearance-none font-500 hover:bg-gray-200 rounded-[4px] px-[12px] h-[32px] w-full bg-gray-100 text-md'>
          Disconnect
        </button>
      </div>
    </div>
  )
}

export default WalletPreviewCard
