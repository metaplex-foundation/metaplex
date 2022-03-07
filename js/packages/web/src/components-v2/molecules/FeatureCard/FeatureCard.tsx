import React, { FC } from 'react'
import CN from 'classnames'

export interface FeatureCardProps {
  [x: string]: any
}

export const FeatureCard: FC<FeatureCardProps> = ({
  className,
  icon,
  heading,
  description,
  ...restProps
}: FeatureCardProps) => {
  const FeatureCardClasses = CN(
    `feature-card flex flex-col items-center px-[32px] lg:px-0 gap-[12px] lg:gap-[20px] text-center`,
    className
  )

  return (
    <div className={FeatureCardClasses} {...restProps}>
      {icon && <img src={icon} className='mb-[8px] h-[76px] w-[140px] object-contain' />}
      <h3 className='text-h6 text-gray-800 md:text-h5'>{heading}</h3>
      <p
        className='max-w-[400px] text-md text-gray-700 lg:text-base'
        dangerouslySetInnerHTML={{ __html: description }}
      />
    </div>
  )
}

export default FeatureCard
