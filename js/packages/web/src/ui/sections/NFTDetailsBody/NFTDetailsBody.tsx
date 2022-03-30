import React, { FC } from 'react'
import CN from 'classnames'
import { AttributesCard } from '@oyster/common'
import { Button, Image, Avatar, SOLIcon } from '@oyster/common'
import { NFTDetailsTabs } from './../NFTDetailsTabs'

export interface NFTDetailsBodyProps {
  [x: string]: any
}

const attributes = [
  {
    label: 'Background',
    value: 'Orange',
    tag: '44.14%',
  },
  {
    label: 'Fur/Skin',
    value: 'Brown / Yellow',
    tag: '23.11%',
  },
  {
    label: 'Mouth',
    value: 'Corndog',
    tag: '12.00%',
  },
  {
    label: 'Clothing',
    value: 'Cheerleader',
    tag: '99.00%',
  },
  {
    label: 'Generation',
    value: '2',
    tag: '30.00%',
  },
  {
    label: 'Head',
    value: "Musketeer's hat",
    tag: '54.78%',
  },
]

export const NFTDetailsBody: FC<NFTDetailsBodyProps> = ({
  className,
  ...restProps
}: NFTDetailsBodyProps) => {
  const NFTDetailsBodyClasses = CN(`nft-details-body w-full`, className)

  return (
    <div className={NFTDetailsBodyClasses} {...restProps}>
      <div className='shadow-card-light container flex gap-[40px] rounded border border-slate-200 bg-white p-[40px]'>
        <div className='sidebar flex w-[400px] flex-shrink-0 flex-col gap-[40px]'>
          <span className='w-full overflow-hidden rounded-[8px]'>
            <Image src='/img/temp/nft12.webp' />
          </span>

          <div className='flex flex-col gap-[16px]'>
            <h5 className='text-h5 font-500'>Description</h5>
            <p className='text-md text-slate-600'>
              Our mission here at the academy is simple: Take 10,000 of the smoothest brained apes,
              put them all in one location and let the mayhem ensue.
            </p>
          </div>

          <div className='flex flex-col gap-[16px]'>
            <h5 className='text-h5 font-500'>Attributes</h5>

            <div className='flex w-full flex-col gap-[8px]'>
              {attributes.map(({ label, value, tag }: any, index: number) => (
                <AttributesCard
                  key={index}
                  overline={label}
                  label={value}
                  tag={`🔥 ${tag}`}
                  hasHoverEffect={false}
                  className='cursor-auto !py-[12px] !px-[16px]'
                />
              ))}
            </div>
          </div>
        </div>

        <div className='content flex w-full flex-col'>
          <div className='flex flex-col gap-[28px]'>
            <div className='flex flex-col gap-[16px]'>
              <div className='flex flex-col gap-[4px]'>
                <h2 className='text-h2 font-500 text-slate-800'>Degen Ape #3617</h2>
                <div className='flex items-center gap-[4px]'>
                  <h6 className='text-h6 font-400'>Degenerate Ape Academy</h6>
                  <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
                </div>
              </div>

              <Avatar
                image='https://images.unsplash.com/photo-1511485977113-f34c92461ad9?crop=faces&fit=crop&h=200&w=200'
                label='Owned by — 8BSR...N16V'
                size={32}
                labelClassName='text-sm font-500 text-B-400'
              />
            </div>

            <div className='flex flex-col gap-[12px]'>
              <h5 className='text-h6 font-400'>Current price</h5>
              <div className='flex items-center gap-[8px]'>
                <SOLIcon size={24} />
                <h4 className='text-h4 font-600 leading-[1]'>2.36 SOL</h4>
                <span className='ml-[4px] text-lg text-slate-500'>$4.19</span>
              </div>
            </div>

            <div className='flex items-center gap-[16px]'>
              <Button size='lg' className='w-[230px]'>
                Buy Now
              </Button>

              <div className='flex h-[56px] max-w-[295px] items-center rounded-full border border-slate-200 py-[4px] pr-[4px] pl-[20px] focus-within:border-N-800 focus-within:!shadow-[0px_0px_0px_1px_#040D1F]'>
                <div className='flex h-full items-center gap-[8px]'>
                  <SOLIcon size={18} />
                  <input
                    type='text'
                    placeholder='Enter'
                    className='h-full w-full appearance-none bg-transparent outline-none'
                  />
                </div>
                <Button appearance='neutral' size='md' className='h-full w-[180px] flex-shrink-0'>
                  Place Bid
                </Button>
              </div>
            </div>

            <NFTDetailsTabs />
          </div>
        </div>
      </div>
    </div>
  )
}

NFTDetailsBody.defaultProps = {}

export default NFTDetailsBody
