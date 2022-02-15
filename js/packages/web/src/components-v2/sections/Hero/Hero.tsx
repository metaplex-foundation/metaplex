import React, { FC } from 'react'
import CN from 'classnames'
import { Parallax } from 'react-parallax'
import { heroSlider } from '../../../../dummy-data/hero-slider'
import { CardPreview } from '../../molecules/CardPreview'

import { useViewport } from '../../../utils/useViewport'

export interface HeroProps {
  [x: string]: any
}

export const Hero: FC<HeroProps> = ({ className, ...restProps }: HeroProps) => {
  const { isMobile } = useViewport()
  const HeroClasses = CN(`hero relative`, className)

  return (
    <div className={HeroClasses} {...restProps}>
      <Parallax
        blur={0}
        bgImage='/img/hero-bg.png'
        bgImageAlt='Karmaverse'
        strength={200}
        bgClassName='!object-cover !h-[1080px] md:!h-[900px] lg:!h-[900px] !w-full'
      >
        {isMobile && (
          <span className='absolute top-0 bottom-0 left-0 right-0 h-full w-full bg-white opacity-100' />
        )}

        <div className='container relative flex flex-col items-center justify-between py-[40px] text-center md:pt-[60px] lg:flex-row lg:py-[148px] lg:text-left'>
          <div className='flex flex-col md:text-white'>
            <h1 className='mb-[24px] w-full max-w-[472px] text-h3 font-600 md:text-white lg:text-h1'>
              Buy, sell, trade <br />
              <span className='text-B-400 md:text-white'>eco-friendly</span> NFTs
            </h1>

            <p className='mb-[20px] w-full max-w-[320px] text-base lg:max-w-[472px] lg:text-lg'>
              Karmaverse is an eco-friendly NFT exchange that rewards users for their activity and
              donates a portion of every trade to charitable causes.
            </p>

            <a
              href='#'
              className='mb-[28px] flex items-center justify-center gap-[4px] text-B-400 hover:text-B-500 md:mb-[28px] md:text-G-100 md:hover:text-G-200 lg:mb-[40px] lg:justify-start'
            >
              Learn more <i className='ri-arrow-right-s-line' />
            </a>

            <div className='flex w-full max-w-[472px] items-center gap-[16px] md:flex-row lg:gap-[28px]'>
              <button className='h-[40px] w-full rounded-full bg-B-400 px-[20px] text-md font-500 uppercase text-white hover:bg-B-500 lg:h-[48px]'>
                Explore
              </button>

              <button className='h-[40px] w-full rounded-full bg-P-400 px-[20px] text-md font-500 uppercase text-white hover:bg-P-500 lg:h-[48px]'>
                Create
              </button>
            </div>
          </div>

          <div className='flex w-full px-[16px] pt-[40px] md:pt-[80px] lg:w-[unset] lg:pt-0'>
            <CardPreview list={heroSlider} />
          </div>
        </div>
      </Parallax>
    </div>
  )
}

export default Hero
