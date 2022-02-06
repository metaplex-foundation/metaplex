import React, { FC } from 'react';
import CN from 'classnames';

export interface AvatarProps {
  [x: string]: any;
  image?: string;
  onClick?: any;
  hasBorder?: boolean;
  size?: 'sm' | 'md' | 'default' | 'lg';
}

export const Avatar: FC<AvatarProps> = ({
  className,
  image,
  onClick,
  size,
  hasBorder,
  ...restProps
}: AvatarProps) => {
  const AvatarClasses = CN(`avatar rounded-full overflow-hidden`, className, {
    'border-[8px] border-white': hasBorder,
    'w-[150px] h-[150px]': size === 'lg',
    'w-[76px] h-[76px]': size === 'default',
    'w-[56px] h-[56px]': size === 'md',
    'w-[36px] h-[36px]': size === 'sm',
  });

  return (
    <div className={AvatarClasses} {...restProps}>
      <img
        src={image}
        onClick={onClick}
        className="w-full h-full rounded-full"
      />
    </div>
  );
};

Avatar.defaultProps = {
  size: 'default',
};

export default Avatar;
