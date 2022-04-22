import React, { FC } from 'react'
import CN from 'classnames'

export interface SocialCardProps {
  [x: string]: any
  icon?: any
  label?: string
  description?: string
}

export const SocialCard: FC<SocialCardProps> = ({
  className,
  icon,
  label,
  description,
  ...restProps
}: SocialCardProps) => {
  const SocialCardClasses = CN(
    `social-card shadow-card bg-white flex flex-col gap-[12px] py-[40px] px-[20px] rounded-[12px]`,
    className
  )

  return (
    <div className={SocialCardClasses} {...restProps}>
      <span className='icon flex h-[64px] w-[64px] items-center justify-center rounded-full bg-B-50 text-B-400 text-[24px]'>
        {icon}
      </span>
      <label className='text-h6 font-500 pt-[8px]'>{label}</label>
      <p className='text-md'>{description}</p>
    </div>
  )
}

SocialCard.defaultProps = {}

export default SocialCard
