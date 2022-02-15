import React, { FC } from 'react'
import CN from 'classnames'

export interface CallToActionProps {
  [x: string]: any
}

export const CallToAction: FC<CallToActionProps> = ({
  className,
  ...restProps
}: CallToActionProps) => {
  const CallToActionClasses = CN(`call-to-action w-full`, className)

  return (
    <div className={CallToActionClasses} {...restProps}>
      <div className='container'>
        <div className='relative flex cursor-pointer flex-col items-center justify-center gap-[20px] overflow-hidden rounded-[12px] bg-[linear-gradient(94.38deg,_#448fff_1.06%,_#005cc1_107.04%)] pt-[40px] pb-[40px] text-center md:pt-[60px] md:pb-[60px] lg:rounded-[28px] lg:pt-[60px] lg:pb-[60px]'>
          <span className='absolute top-0 bottom-0 left-0 right-0 bg-[url("/img/branding-bg-1.png")] bg-cover bg-no-repeat' />
          <h2 className='relative z-10 text-h4 text-white lg:text-h2'>
            Launch Your Project
            <br />
            Using Our Launchpad
          </h2>
          <p className='relative z-10 text-white'>Click to apply</p>
        </div>
      </div>
    </div>
  )
}

export default CallToAction
