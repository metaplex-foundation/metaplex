import React, { FC } from 'react'
import CN from 'classnames'
import { Swiper, SwiperSlide } from 'swiper/react'
import SwiperCore, { Thumbs, Pagination, Mousewheel } from 'swiper'

import 'swiper/css'
import 'swiper/css/thumbs'
import 'swiper/css/pagination'

SwiperCore.use([Thumbs, Pagination, Mousewheel])

export interface CardPreviewProps {
  [x: string]: any
  list?: any[]
  tag?: any
}

export const CardPreviewSlide = ({ src, title, value }: any) => {
  return (
    <div className='flex h-full flex-col justify-center gap-[12px]'>
      <img
        src={src}
        alt='card preview'
        className='h-[320px] max-w-[100%] rounded-[8px] object-cover object-center lg:h-[406px] lg:w-[385px]'
      />

      <span className='flex items-center gap-[12px] md:text-white'>
        <label className='lg:text-lg'>{title}</label>
        <label className='text-sm font-600 text-green-500 lg:text-green-400'>{value}</label>
      </span>
    </div>
  )
}

export const CardPreview: FC<CardPreviewProps> = ({
  className,
  list = [],
  ...restProps
}: CardPreviewProps) => {
  const CardPreviewClasses = CN(`card-preview w-full relative overflow-hidden`, className)

  return (
    <div className={CN(CardPreviewClasses, className)} {...restProps}>
      <div className='card-preview__top relative mb-[20px] flex w-full items-center justify-center overflow-hidden lg:w-[385px]'>
        {list?.length !== 0 && (
          <Swiper
            spaceBetween={10}
            navigation={true}
            pagination={{ clickable: true }}
            className='card-preview__slides h-full w-full'
            mousewheel={{ forceToAxis: true }}
            breakpoints={{
              // when window width is >= 320px
              320: {
                slidesPerView: 1,
              },
              // when window width is >= 768px
              768: {
                slidesPerView: 2,
                spaceBetween: 30,
              },
              // when window width is >= 1264px
              1170: {
                slidesPerView: 1,
              },
            }}
          >
            {(list || []).map(({ id, image, name, rate }: any, index: number) => {
              return (
                <SwiperSlide key={id || index}>
                  <CardPreviewSlide src={image} title={name} value={rate} />
                </SwiperSlide>
              )
            })}
          </Swiper>
        )}
      </div>
    </div>
  )
}

export default CardPreview
