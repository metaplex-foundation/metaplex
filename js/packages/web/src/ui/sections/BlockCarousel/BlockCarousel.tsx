import React, { FC, useEffect } from 'react'
import CN from 'classnames'
import Swiper, { Navigation, Autoplay, Mousewheel } from 'swiper'

export interface SlideProps {
  Component?: any
  [x: string]: any
  id?: number | string
}

export interface BlockCarouselProps {
  [x: string]: any
  id?: string
  nextButton?: any
  prevButton?: any
  slides?: SlideProps[]
  options?: {
    [x: string]: any
  }
}

const SampleComponent = ({ children }: any) => {
  return (
    <div className='flex h-[400px] w-full items-center justify-center bg-[#C2D0DE] text-[40px] font-[600] uppercase text-white'>
      {children}
    </div>
  )
}

export const BlockCarousel: FC<BlockCarouselProps> = ({
  className,
  id,
  options,
  slides,
  loop,
  onChangeIndex,
  ...restProps
}: BlockCarouselProps) => {
  const BlockCarouselClasses = CN(`block-carousel w-full flex flex-col relative`, className)

  const {
    autoPlay,
    centeredSlides,
    slideClass,
    slidePrevClass,
    slidesPerView,
    spaceBetween,
    updateOnWindowResize,
    wrapperClass,
    resizeObserver,
    ...restOptions
  } = options || {}

  useEffect(() => {
    Swiper.use([Navigation, Autoplay, Mousewheel])

    const swiper = new Swiper(`#${id}` || '.block-carousel', {
      autoplay: autoPlay || false,
      centeredSlides: centeredSlides || false,
      direction: 'horizontal',
      slideClass: slideClass || 'block-carousel__item',
      slidePrevClass: slidePrevClass || 'block-carousel__item__prev',
      slidesPerView: slidesPerView || 4,
      spaceBetween: spaceBetween || 32,
      updateOnWindowResize: updateOnWindowResize || true,
      wrapperClass: wrapperClass || 'block-carousel__wrapper',
      navigation: {
        nextEl: `.${id}-next-button`,
        prevEl: `.${id}-prev-button`,
      },
      resizeObserver: resizeObserver || true,
      mousewheel: { forceToAxis: true },
      loop: loop || false,
      on: {
        slideChange: function () {
          onChangeIndex(
            (swiper.isBeginning && 'isFirst') || (swiper.isEnd && 'isLast') || swiper.activeIndex
          )
        },
      },
      ...restOptions,
    })
  }, [])

  const sampleSlides = [
    { id: 0, Component: () => <SampleComponent>Slide one</SampleComponent> },
    { id: 1, Component: () => <SampleComponent>Slide two</SampleComponent> },
    { id: 2, Component: () => <SampleComponent>Slide three</SampleComponent> },
  ]

  return (
    <div id={id} className={BlockCarouselClasses} {...restProps}>
      <ul className='block-carousel__wrapper m-0 flex list-none p-0'>
        {(slides || sampleSlides).map(
          ({ id, Component, ...restProps }: SlideProps, index: number) => (
            <li
              key={id || index}
              className='block-carousel__item flex flex-shrink-0 flex-col'
              {...restProps}>
              <Component />
            </li>
          )
        )}
      </ul>
    </div>
  )
}

export const NextButton = (prop: any) => (
  <svg
    width='122'
    height='122'
    viewBox='0 0 122 122'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...prop}>
    <g filter='url(#filter0_dd_18_18302)'>
      <path
        d='M20 53C20 30.3563 38.3563 12 61 12C83.6437 12 102 30.3563 102 53C102 75.6437 83.6437 94 61 94C38.3563 94 20 75.6437 20 53Z'
        fill='white'
      />
      <path
        d='M62.758 53L56.3935 46.6355C55.8078 46.0498 55.8078 45.1002 56.3935 44.5145C56.9792 43.9288 57.9288 43.9288 58.5145 44.5145L67 53L58.5145 61.4855C57.9288 62.0712 56.9792 62.0712 56.3935 61.4855C55.8078 60.8998 55.8078 59.9502 56.3935 59.3645L62.758 53Z'
        fill='#040D1F'
      />
    </g>
    <defs>
      <filter
        id='filter0_dd_18_18302'
        x='0'
        y='0'
        width='122'
        height='122'
        filterUnits='userSpaceOnUse'
        colorInterpolationFilters='sRGB'>
        <feFlood floodOpacity='0' result='BackgroundImageFix' />
        <feColorMatrix
          in='SourceAlpha'
          type='matrix'
          values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          result='hardAlpha'
        />
        <feMorphology
          radius='4'
          operator='erode'
          in='SourceAlpha'
          result='effect1_dropShadow_18_18302'
        />
        <feOffset dy='8' />
        <feGaussianBlur stdDeviation='12' />
        <feColorMatrix
          type='matrix'
          values='0 0 0 0 0.0705882 0 0 0 0 0.0627451 0 0 0 0 0.215686 0 0 0 0.08 0'
        />
        <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_18_18302' />
        <feColorMatrix
          in='SourceAlpha'
          type='matrix'
          values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          result='hardAlpha'
        />
        <feMorphology
          radius='6'
          operator='erode'
          in='SourceAlpha'
          result='effect2_dropShadow_18_18302'
        />
        <feOffset dy='6' />
        <feGaussianBlur stdDeviation='6' />
        <feColorMatrix
          type='matrix'
          values='0 0 0 0 0.0705882 0 0 0 0 0.0627451 0 0 0 0 0.215686 0 0 0 0.12 0'
        />
        <feBlend
          mode='normal'
          in2='effect1_dropShadow_18_18302'
          result='effect2_dropShadow_18_18302'
        />
        <feBlend
          mode='normal'
          in='SourceGraphic'
          in2='effect2_dropShadow_18_18302'
          result='shape'
        />
      </filter>
    </defs>
  </svg>
)

export const PrevButton = (prop: any) => (
  <svg
    width='122'
    height='122'
    viewBox='0 0 122 122'
    fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...prop}>
    <g filter='url(#filter0_dd_101_53785)'>
      <path
        d='M102 53C102 30.3563 83.6437 12 61 12V12C38.3563 12 20 30.3563 20 53V53C20 75.6437 38.3563 94 61 94V94C83.6437 94 102 75.6437 102 53V53Z'
        fill='white'
      />
      <path
        d='M59.242 53L65.6065 46.6355C66.1922 46.0498 66.1922 45.1002 65.6065 44.5145V44.5145C65.0208 43.9288 64.0712 43.9288 63.4855 44.5145L55 53L63.4855 61.4855C64.0712 62.0712 65.0208 62.0712 65.6065 61.4855V61.4855C66.1922 60.8998 66.1922 59.9502 65.6065 59.3645L59.242 53Z'
        fill='#040D1F'
      />
    </g>
    <defs>
      <filter
        id='filter0_dd_101_53785'
        x='0'
        y='0'
        width='122'
        height='122'
        filterUnits='userSpaceOnUse'
        colorInterpolationFilters='sRGB'>
        <feFlood floodOpacity='0' result='BackgroundImageFix' />
        <feColorMatrix
          in='SourceAlpha'
          type='matrix'
          values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          result='hardAlpha'
        />
        <feMorphology
          radius='4'
          operator='erode'
          in='SourceAlpha'
          result='effect1_dropShadow_101_53785'
        />
        <feOffset dy='8' />
        <feGaussianBlur stdDeviation='12' />
        <feColorMatrix
          type='matrix'
          values='0 0 0 0 0.0705882 0 0 0 0 0.0627451 0 0 0 0 0.215686 0 0 0 0.08 0'
        />
        <feBlend mode='normal' in2='BackgroundImageFix' result='effect1_dropShadow_101_53785' />
        <feColorMatrix
          in='SourceAlpha'
          type='matrix'
          values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0'
          result='hardAlpha'
        />
        <feMorphology
          radius='6'
          operator='erode'
          in='SourceAlpha'
          result='effect2_dropShadow_101_53785'
        />
        <feOffset dy='6' />
        <feGaussianBlur stdDeviation='6' />
        <feColorMatrix
          type='matrix'
          values='0 0 0 0 0.0705882 0 0 0 0 0.0627451 0 0 0 0 0.215686 0 0 0 0.12 0'
        />
        <feBlend
          mode='normal'
          in2='effect1_dropShadow_101_53785'
          result='effect2_dropShadow_101_53785'
        />
        <feBlend
          mode='normal'
          in='SourceGraphic'
          in2='effect2_dropShadow_101_53785'
          result='shape'
        />
      </filter>
    </defs>
  </svg>
)

BlockCarousel.defaultProps = {}

export default BlockCarousel
