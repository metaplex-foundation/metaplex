import React, { FC } from 'react'
import CN from 'classnames'
import { AttributesCard, Image, Tag, Button, SOLIcon } from '@oyster/common'

export interface QuickBuyProps {
  [x: string]: any
}

const dummyAttributes = [
  {
    overline: 'Clothing',
    value: 'Cheerleader',
    tag: '44.14%',
  },
  {
    overline: 'Generation',
    value: '1',
    tag: '44.14%',
  },
  {
    overline: 'Head',
    value: "Musketeer's Hat",
    tag: '44.14%',
  },
  {
    overline: 'Clothing',
    value: 'Cheerleader',
    tag: '44.14%',
  },
  {
    overline: 'Generation',
    value: '1',
    tag: '44.14%',
  },
  {
    overline: 'Head',
    value: "Musketeer's Hat",
    tag: '44.14%',
  },
]

export const QuickBuy: FC<QuickBuyProps> = ({ className, ...restProps }: QuickBuyProps) => {
  const QuickBuyClasses = CN(`quick-buy flex flex-col gap-[32px]`, className)

  return (
    <div className={QuickBuyClasses} {...restProps}>
      <div className='flex gap-[32px]'>
        <span className='h-[320px] w-[320px] overflow-hidden rounded-[8px]'>
          <Image src='/img/temp/nft12.webp' />
        </span>

        <div className='flex flex-col gap-[28px]'>
          <div className='flex flex-col gap-[20px]'>
            <div className='flex flex-col gap-[4px]'>
              <h2 className='text-h2 font-500 text-slate-800'>Degen Ape #3617</h2>
              <div className='flex items-center gap-[4px]'>
                <h6 className='text-h6 font-500'>Degenerate Ape Academy</h6>
                <i className='ri-checkbox-circle-fill text-[24px] text-green-400' />
              </div>

              <div className='flex items-center gap-[8px]'>
                <span className='text-md font-500'>Royalties</span>
                <Tag>2.5%</Tag>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-[8px]'>
            <h5 className='text-h6 font-500'>Current price</h5>
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
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-[20px]'>
        <h5 className='text-h5'>Attributes</h5>
        <div className='grid grid-cols-3 gap-[8px]'>
          {dummyAttributes.map(({ overline, value, tag }: any, index: number) => (
            <AttributesCard
              key={index}
              overline={overline}
              value={value}
              className='cursor-auto py-[12px] px-[16px] shadow-card-light'
              hasHoverEffect={false}
              tag={
                <div className='flex w-full items-center justify-center gap-[8px]'>
                  <span>🔥</span>
                  <span>{tag}</span>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </div>
  )
}

QuickBuy.defaultProps = {}

export default QuickBuy
