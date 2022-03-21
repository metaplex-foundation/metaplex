import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Placeholder } from '../Placeholder'

export interface ImageProps {
  [x: string]: any
  src?: string
  imgClassName?: string
}

export const Image: FC<ImageProps> = ({
  className,
  src,
  imgClassName,
  ...restProps
}: ImageProps) => {
  const ImageClasses = CN(`image flex w-[inherit] h-[inherit]`, className)
  const [isImageLoaded, setIsImageLoaded] = useState(false)

  return (
    <div className={ImageClasses} {...restProps}>
      {!isImageLoaded && <Placeholder />}
      <img
        src={src}
        className={CN('h-[inherit] w-full max-w-full object-cover', imgClassName)}
        onLoad={() => setIsImageLoaded(true)}
        style={isImageLoaded ? {} : { display: 'none' }}
      />
    </div>
  )
}

export default Image
