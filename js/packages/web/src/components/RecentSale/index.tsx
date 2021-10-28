import React, { useEffect,  useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Card } from 'react-bootstrap';
import SwiperCore, { Autoplay, Pagination, Navigation } from 'swiper';

// modules
import useWindowDimensions from '../../utils/layout';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// constants

const IMAGES = [
  {
    src: '/images/sales-img1.png',
  },
  {
    src: '/images/sales-img2.png',
  },
  {
    src: '/images/sales-img3.png',
  },
  {
    src: '/images/sales-img1.png',
  },
  {
    src: '/images/sales-img2.png',
  },
  {
    src: '/images/sales-img3.png',
  },
];

function getSlideWidth(width) {
  let slide = 3;
  if (width < 850) {
    slide = 1;
  } else if (width < 1140) {
    slide = 2;
  }
  return slide;
}

export const RecentSale = () => {
  const { width } = useWindowDimensions();
  const [slidWidth , setSlidWidth] = useState(width)
  useEffect(() => {
    if (!width) return;
    setSlidWidth(getSlideWidth(width));
  }, [width]);
  SwiperCore.use([Autoplay, Pagination, Navigation]);
  return (
    <section id="recent-sales">
      <div className="container-fluid recent-sales-container">
        <div className="row">
          <div className="col-md-2"></div>
          <div className="col-md-8 text-center">
            <h1 className="mt-0">Recent Sales</h1>
          </div>
          <div className="col-md-2"></div>
        </div>
        <div id="recentcarousel" className="row mt-4">
          <Swiper
            slidesPerView={slidWidth}
            spaceBetween={100}
            autoplay={{ delay: 3000 }}
            slidesPerGroup={3}
            loop={true}
            loopFillGroupWithBlank={true}
            navigation
            className="r-mySwiper "
          >
            {IMAGES.map((item, i) => (
              <SwiperSlide key={i} className="r-next ">
                <Card className="text-center">
                  <div className="img-card">
                    <img src={item.src} className="card-img-top" alt="logo" /></div>
                  <div className="card-body">
                    <h5 className="card-title text-white mt-10">
                      Begginer’s guide to creating and selling NFT
                    </h5>
                    <p className="card-text">
                      You will learn how to create and sell your own NFT with
                      NINJAPLEX
                    </p>
                  </div>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
};
