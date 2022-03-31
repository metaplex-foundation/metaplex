import React, { FC } from 'react'
import CN from 'classnames'
import { Image } from '..'
import { Identicon } from '../../components'

export interface AvatarProps {
  image?: string
  onClick?: any
  label?: string
  labelClassName?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | number
  address?: string
  className?: string
}

export const Avatar: FC<AvatarProps> = ({
  image,
  onClick,
  size,
  label,
  labelClassName,
  address,
  className,
  ...restProps
}) => {
  const AvatarClasses = CN(`avatar flex items-center gap-[8px] font-500`, className, {
    'text-lg': size === 'lg',
    'text-md': size === 'md',
    'text-sm': size === 'sm',
  })

  return (
    <div className={AvatarClasses} onClick={onClick} {...restProps}>
      <span
        className={CN('flex overflow-hidden rounded-full', {
          'h-[160px] w-[160px]': typeof size !== 'number' && size === 'xl',
          'h-[56px] w-[56px]': typeof size !== 'number' && size === 'lg',
          'h-[40px] w-[40px]': typeof size !== 'number' && size === 'md',
          'h-[24px] w-[24px]': typeof size !== 'number' && size === 'sm',
        })}
        style={{
          width: typeof size === 'number' ? `${size}px` : '',
          height: typeof size === 'number' ? `${size}px` : '',
        }}>
        {!image ? (
          <Identicon alt={'ima'} address={address} style={{ width: size }} />
        ) : (
          <Image src={image} />
        )}
      </span>

      {label && <span className={labelClassName}>{label}</span>}
    </div>
  )
}

Avatar.defaultProps = {
  size: 'md',
}
