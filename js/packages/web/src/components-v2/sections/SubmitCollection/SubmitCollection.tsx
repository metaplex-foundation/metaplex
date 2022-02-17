import React, { FC } from 'react'
import CN from 'classnames'
import { Link } from 'react-router-dom'

export interface SubmitCollectionProps {
  [x: string]: any
}

export const SubmitCollection: FC<SubmitCollectionProps> = ({
  className,
  ...restProps
}: SubmitCollectionProps) => {
  const SubmitCollectionClasses = CN(`submit-collection`, className)

  return (
    <div className={SubmitCollectionClasses} {...restProps}>
      <div className='container flex flex-col items-center gap-[28px] text-center'>
        <h2 className='text-h4 text-gray-800 md:text-h3'>Submit collection</h2>
        <p className='w-full max-w-[580px] text-gray-700'>
          Do you have a Solana based NFT collection? Submit your collection below to be added to our
          Marketplace and shown to thousands of users!
          <a className='inline-flex cursor-pointer items-center text-B-400'>
            Learn More <i className='ri-arrow-right-s-line' />
          </a>
        </p>

        <div className='w-full pt-[12px]'>
          <Link to='/submit-collection'>
            <button className='inline-flex h-[48px] w-full appearance-none items-center justify-center rounded-full bg-[linear-gradient(89.57deg,_#448fff_0.79%,_#0066D6_124%)] px-[40px] text-white outline-none hover:bg-[linear-gradient(89.57deg,_#308fc5_0.79%,_#1a44af_124%)] md:w-[440px] lg:h-[60px] lg:text-lg'>
              Apply here
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default SubmitCollection
