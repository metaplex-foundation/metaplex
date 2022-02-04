import React, { FC } from 'react';
import CN from 'classnames';
import { Swiper, SwiperSlide } from 'swiper/react';
import SwiperCore, { Thumbs, Pagination, Mousewheel } from 'swiper';

import 'swiper/css';
import 'swiper/css/thumbs';
import 'swiper/css/pagination';

SwiperCore.use([Thumbs, Pagination, Mousewheel]);

export interface CardPreviewProps {
  [x: string]: any;
  list?: any[];
  tag?: any;
}

export const CardPreviewSlide = ({ src, title, value }: any) => {
  return (
    <div className="flex flex-col justify-center h-full gap-[12px]">
      <img
        src={src}
        alt="card preview"
        className="max-w-[100%] object-cover object-center h-[406px] w-[385px] rounded-[8px]"
      />

      <span className="flex items-center text-white gap-[12px]">
        <label className="text-lg">{title}</label>
        <label className="text-[#05FF00] text-sm font-600">{value}</label>
      </span>
    </div>
  );
};

export const CardPreview: FC<CardPreviewProps> = ({
  className,
  list = [],
  ...restProps
}: CardPreviewProps) => {
  const CardPreviewClasses = CN(
    `card-preview w-full relative overflow-hidden`,
    className,
  );

  return (
    <div className={CN(CardPreviewClasses, className)} {...restProps}>
      <div className="w-[385px] card-preview__top mb-[20px] flex overflow-hidden relative items-center justify-center">
        {list?.length !== 0 && (
          <Swiper
            spaceBetween={10}
            navigation={true}
            pagination={{ clickable: true }}
            className="w-full h-full card-preview__slides"
            mousewheel={{ forceToAxis: true }}
          >
            {(list || []).map(
              ({ id, image, name, rate }: any, index: number) => {
                return (
                  <SwiperSlide key={id || index}>
                    <CardPreviewSlide src={image} title={name} value={rate} />
                  </SwiperSlide>
                );
              },
            )}
          </Swiper>
        )}
      </div>
    </div>
  );
};

export default CardPreview;
