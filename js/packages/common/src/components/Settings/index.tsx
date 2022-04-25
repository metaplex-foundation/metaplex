import React from 'react'
import { Tooltip } from 'antd'
import { useWallet } from '@solana/wallet-adapter-react'
import { shortenAddress } from '../../utils'
import { CopyOutlined } from '@ant-design/icons'
import { Identicon } from '../Identicon'
import { Link } from 'react-router-dom'

export const Settings = ({ additionalSettings }: { additionalSettings?: JSX.Element }) => {
  const { publicKey } = useWallet()

  return (
    <>
      <div className='flex w-full flex-col items-center justify-center gap-[8px] border-b border-slate-200 p-[16px]'>
        <Link to='/artworks'>
          <Identicon
            address={publicKey?.toBase58()}
            style={{
              width: 48,
            }}
          />
        </Link>

        <Link to='/profile'>
          <p className='font-100'>My Account</p>
        </Link>

        {publicKey && (
          <>
            <Tooltip title='Address copied'>
              <div
                className='font-500 flex items-center gap-[4px]'
                onClick={() => navigator.clipboard.writeText(publicKey?.toBase58() || '')}>
                <CopyOutlined />
                {shortenAddress(publicKey?.toBase58())}
              </div>
            </Tooltip>
          </>
        )}
      </div>

      <div className='flex'>{additionalSettings}</div>
    </>
  )
}
