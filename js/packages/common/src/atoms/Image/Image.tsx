import React, { FC, useState } from 'react'
import CN from 'classnames'
import { PlaceholderImage } from '..'

export interface ImageProps {
  [x: string]: any
  src?: string
}

export const Image: FC<ImageProps> = ({ className, src, ...restProps }: ImageProps) => {
  const ImageClasses = CN(`image flex w-[inherit] h-[inherit]`, className)
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  return (
    <div className={ImageClasses} {...restProps}>
      {!isImageLoaded && <PlaceholderImage />}
      <img
        src={src}
        className='w-full max-w-full object-cover'
        onLoad={() => setIsImageLoaded(true)}
        style={isImageLoaded ? {} : { display: 'none' }}
      />
    </div>
  )
}

export default Image
