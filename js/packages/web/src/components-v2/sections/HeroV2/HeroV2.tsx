import React, { FC } from 'react'
import CN from 'classnames'
import { Parallax } from 'react-parallax'
import { Button } from '@oyster/common'

import { heroSlider } from '../../../../dummy-data/hero-slider'
import { BlockCarousel } from '../../molecules/BlockCarousel'
import { TrendingCard } from '../../molecules/TrendingCard'
import { useViewport } from '../../../utils/useViewport'

export interface HeroV2Props {
  [x: string]: any
}

export const HeroV2: FC<HeroV2Props> = ({ className, ...restProps }: HeroV2Props) => {
  const { isDesktop } = useViewport()
  const HeroV2Classes = CN(`hero-v2 relative border-b border-gray-200 relative`, className)

  const slidesList = (heroSlider || []).map(
    (
      { id, nft, heading, description, bgImage, headingClassName, primaryCTA, secondaryCTA }: any,
      index
    ) => ({
      id: id || index,
      Component: () => (
        <Parallax
          blur={0}
          bgImage={bgImage || '/img/hero-bg.png'}
          bgImageAlt={heading || 'Karmaverse'}
          strength={200}
          bgClassName='!object-cover !h-[1080px] md:!h-[900px] lg:!h-[900px] !w-full'>
          {/* <span className='absolute top-0 bottom-0 left-0 right-0 h-full w-full bg-white opacity-80' /> */}

          <div className='container relative flex flex-col items-center justify-between py-[40px] text-center md:pt-[60px] lg:flex-row lg:py-[148px] lg:text-left'>
            <div className='flex flex-col md:text-gray-800'>
              <h1
                className={CN(
                  'mb-[24px] w-full max-w-[472px] text-h3 font-600 md:text-gray-800 lg:text-h2',
                  headingClassName
                )}
                dangerouslySetInnerHTML={{ __html: heading || '' }}
              />

              <p
                className='mb-[20px] w-full max-w-[320px] text-base lg:max-w-[472px] lg:text-base'
                dangerouslySetInnerHTML={{ __html: description || '' }}
              />

              <a
                href='#'
                className='mb-[28px] flex items-center justify-center gap-[4px] text-B-400 hover:text-B-500 md:mb-[28px] lg:mb-[40px] lg:justify-start'>
                Learn more <i className='ri-arrow-right-s-line' />
              </a>

              <div className='flex w-full max-w-[472px] items-center gap-[16px] md:flex-row lg:gap-[28px]'>
                {primaryCTA && primaryCTA?.label && (
                  <Button isRounded size={isDesktop ? 'xl' : 'md'} className='w-full lg:w-[200px]'>
                    {primaryCTA?.label}
                  </Button>
                )}

                {secondaryCTA && secondaryCTA?.label && (
                  <Button
                    isRounded
                    size={isDesktop ? 'xl' : 'md'}
                    className='w-full lg:w-[200px]'
                    appearance='complimentary'>
                    {secondaryCTA?.label}
                  </Button>
                )}
              </div>
            </div>

            <div className='flex w-full px-[16px] pt-[40px] md:pt-[80px] lg:w-[unset] lg:pt-0'>
              <TrendingCard size='lg' image={nft?.image} trendingPercentage={nft?.rate} />
            </div>
          </div>
        </Parallax>
      ),
    })
  )

  return (
    <div className={HeroV2Classes} {...restProps}>
      <BlockCarousel
        id='hero-v2-carousel'
        options={{
          slidesPerView: 1,
          autoPlay: false,
          loop: false,
          mousewheel: false,
          pagination: {
            el: '.swiper-pagination',
            clickable: true,
          },
        }}
        prevButton={'.hero-v2-carousel--prev'}
        nextButton={'.hero-v2-carousel--next'}
        slides={slidesList}
        className='!h-full !w-full'
      />
    </div>
  )
}

export default HeroV2
