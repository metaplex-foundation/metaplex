import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Card } from 'react-bootstrap';
import SwiperCore, { Autoplay, Pagination, Navigation } from 'swiper';
import { Link } from 'react-router-dom';
import { Button } from 'antd';

// modules
import useWindowDimensions from '../../utils/layout';
import { useCollections } from '../../hooks/useCollections';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

//constant

function getSlideWidth(width) {
  let slide = 3;
  if (width < 850) {
    slide = 1;
  } else if (width < 1140) {
    slide = 2;
  }
  return slide;
}

export const Slider = () => {

  SwiperCore.use([Autoplay, Pagination, Navigation]);
  const { width } = useWindowDimensions();
  const { collections } = useCollections();
  const [slideWidth, setSlideWidth] = useState(width);

  useEffect(() => {
    if (!width) return;
    setSlideWidth(getSlideWidth(width));
  }, [width]);

 

  return (
    <Swiper
      slidesPerView={slideWidth}
      spaceBetween={40}
      autoplay={{ delay: 10000, disableOnInteraction: false, }}
      slidesPerGroup={1}
      loop={true}
      // loopFillGroupWithBlank={true}
      navigation
      className="mySwiper"
    >
      {collections.map((element, i) => (
        <SwiperSlide key={i} className="next">
          <Link to={'/marketplace/' + element.collectionName}>
            <Card className="text-center card-container">
              <div className="card_img">
                <img
                  src={element.backgroundImage}
                  className="card-img-top"
                  alt="card-logo"
                />
              </div>
              <div className="card-body">
                <img src={element.image} className="img-fluid user" />
                <h5 className="card-title text-white mb-0 mt-3">
                  {element.collectionName}
                </h5>
                <p className="m-0 below-heading-text">{element.userName}</p>
                <p className="card-text">{element.description}</p>
                <Button
                  className="btn btn-primary explore-more-btn"
                  style={{ color: 'white' }}
                >
                  Explore Marketplace
                </Button>
              </div>
            </Card>
          </Link>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
