import React, { FC } from 'react'
import CN from 'classnames'
import { Image } from '..'

export interface AvatarProps {
  [x: string]: any
  image?: string
  onClick?: any
  label?: string
  size?: 'sm' | 'md' | 'lg' | number
}

export const Avatar: FC<AvatarProps> = ({
  className,
  image,
  onClick,
  size,
  label,
  ...restProps
}: AvatarProps) => {
  const AvatarClasses = CN(`avatar flex items-center gap-[8px] font-500`, className, {
    'text-lg': size === 'lg',
    'text-md': size === 'md',
    'text-sm': size === 'sm',
  })

  return (
    <div className={AvatarClasses} onClick={onClick} {...restProps}>
      <span
        className={CN('flex overflow-hidden rounded-full', {
          'h-[56px] w-[56px]': typeof size !== 'number' && size === 'lg',
          'h-[40px] w-[40px]': typeof size !== 'number' && size === 'md',
          'h-[24px] w-[24px]': typeof size !== 'number' && size === 'sm',
        })}
        style={{
          width: typeof size === 'number' ? `${size}px` : '',
          height: typeof size === 'number' ? `${size}px` : '',
        }}>
        <Image src={image} />
      </span>

      {label && <span>{label}</span>}
    </div>
  )
}

Avatar.defaultProps = {
  size: 'md',
}

export default Avatar
