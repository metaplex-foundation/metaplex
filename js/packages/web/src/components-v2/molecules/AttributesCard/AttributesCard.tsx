import React, { FC } from 'react'
import CN from 'classnames'

export interface AttributesCardProps {
  [x: string]: any
}

export const AttributesCard: FC<AttributesCardProps> = ({
  className,
  list,
  ...restProps
}: AttributesCardProps) => {
  const AttributesCardClasses = CN(
    `attributes-card w-full grid grid-cols-2 gap-[8px] p-[20px] bg-gray-50 border border-gray-100 rounded-[8px]`,
    className
  )

  return (
    <div className={AttributesCardClasses} {...restProps}>
      {(list || []).map(({ trait_type, value }: any, index: number) => (
        <div
          key={value || index}
          className='flex flex-col items-center justify-center rounded-[8px] border border-B-200 bg-B-10 px-[12px] py-[6px]'>
          <span className='w-full text-center text-md text-gray-700 capitalize'>{trait_type}</span>
          <span className='w-full text-center text-md font-500 text-gray-900'>{value}</span>
        </div>
      ))}
    </div>
  )
}

export default AttributesCard
