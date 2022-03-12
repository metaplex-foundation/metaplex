import React, { FC } from 'react'
import CN from 'classnames'

export interface PlaceholderImageProps {
  [x: string]: any
}

export const PlaceholderImage: FC<PlaceholderImageProps> = ({
  className,
  ...restProps
}: PlaceholderImageProps) => {
  const PlaceholderImageClasses = CN(
    `placeholder-image w-full h-full flex items-center justify-center bg-N-50 text-N-400`,
    className
  )

  return (
    <div className={PlaceholderImageClasses} {...restProps}>
      <svg
        width='auto'
        height='40%'
        viewBox='0 0 230 200'
        fill='none'
        xmlns='http://www.w3.org/2000/svg'>
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M182.769 186.423C177.919 194.531 168.849 199.994 158.476 199.994C142.996 199.994 130.424 187.834 130.424 172.852C130.424 167.816 131.844 163.099 134.316 159.059L177.516 86.6637C177.559 86.5807 177.61 86.5052 177.656 86.426C185.401 73.451 202.573 68.9995 215.976 76.4886C229.331 83.9511 233.948 100.464 226.328 113.42H226.332L182.768 186.419L182.769 186.423ZM134.051 13.7909C134.144 13.6286 134.242 13.4664 134.343 13.3042L134.347 13.2929C136.722 9.41448 140.126 6.04915 144.45 3.63835C157.856 -3.85436 175.029 0.597531 182.769 13.5758C187.897 22.1663 187.604 32.3524 182.933 40.4345L95.8214 186.429C93.4389 190.425 89.9724 193.892 85.5506 196.367C72.1404 203.852 54.9718 199.4 47.2315 186.429C41.9986 177.661 42.408 167.233 47.3602 159.077L134.051 13.7909ZM47.1068 13.7758C47.1731 13.6664 47.2394 13.5532 47.3096 13.44L47.3213 13.4287C52.1954 5.39646 61.2106 0.00558118 71.5244 0.00558118C87.0049 0.00558118 99.5767 12.1654 99.5767 27.1473C99.5767 32.0255 98.2392 36.6057 95.9035 40.5675L95.8606 40.6505H95.8567L95.8528 40.6656L52.3439 113.574C44.6076 126.545 27.435 130.997 14.0288 123.512C0.618545 116.019 -3.9823 99.4035 3.75798 86.4363L47.1111 13.7798L47.1068 13.7758Z'
          fill='currentColor'
        />
      </svg>
    </div>
  )
}

PlaceholderImage.defaultProps = {}

export default PlaceholderImage
