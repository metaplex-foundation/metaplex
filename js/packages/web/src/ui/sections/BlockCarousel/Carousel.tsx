import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Scrollbar, A11y } from 'swiper'
import { NextButton, PrevButton } from './BlockCarousel'

import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/scrollbar'

const Carousel = ({ slides }: { slides: Array<any> }) => {
  return (
    <>
      <PrevButton className='recent-collections-prev-button absolute top-[100px] left-[-61px] cursor-pointer' />
      <div className='block-carousel relative flex w-full flex-col'>
        <Swiper
          modules={[Navigation, Pagination, Scrollbar, A11y]}
          className='m-0 flex flex w-full list-none flex-col p-0'
          spaceBetween={50}
          slidesPerView={4}
          navigation
          onSlideChange={() => console.log('slide change')}
          onSwiper={swiper => console.log(swiper)}>
          {slides.map(({ id, Component }) => (
            <SwiperSlide className='block-carousel relative flex w-full flex-col' key={id}>
              {Component}
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <NextButton
        // onClick={() => swiper.slideNext()}
        className='recent-collections-next-button absolute top-[100px] right-[-61px] cursor-pointer'
      />
    </>
  )
}
export default Carousel
