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
  radius,
  ...restProps
}: AvatarProps) => {
  const AvatarClasses = CN(
    `avatar rounded-full overflow-hidden`,
    className,
    {
      'border-[8px] border-white': hasBorder,
      'w-[150px] h-[150px]': size === 'lg',
      'w-[76px] h-[76px]': size === 'default',
      'w-[48px] h-[48px]': size === 'md',
      'w-[36px] h-[36px]': size === 'sm',
    },
    radius,
  );

  return (
    <div className={AvatarClasses} {...restProps}>
      <img
        src={image}
        onClick={onClick}
        className={CN('w-full h-full rounded-full', radius)}
      />
    </div>
  );
};

Avatar.defaultProps = {
  size: 'default',
};

export default Avatar;
