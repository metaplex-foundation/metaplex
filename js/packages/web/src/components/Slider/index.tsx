import React from 'react';
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


export const Slider = () => {

  SwiperCore.use([Autoplay, Pagination, Navigation]);
  const { width } = useWindowDimensions();
  const { collections } = useCollections();

  return (
    <Swiper
      slidesPerView={width < 768 ? 1 : 3}
      spaceBetween={40}
      autoplay={{ delay: 3000 }}
      slidesPerGroup={3}
      loop={true}
      // loopFillGroupWithBlank={true}
      navigation
      className="mySwiper"
    >
      {collections.map((element, i) => (
        <SwiperSlide key={i} className="next">
          <Card className="text-center card-container">
            <img
              src={element.backgroundImage}
              className="card-img-top"
              alt="card-logo"
            />
            <div className="card-body">
              <img src={element.image} className="img-fluid user" />
              <h5 className="card-title text-white mb-0 mt-3">
                {element.collectionName}
              </h5>
              <p className="m-0 below-heading-text">{element.userName}</p>
              <p className="card-text">
                {element.description}
              </p>
              <Link to={"/marketplace/" + element.collectionName} >
                <Button className="btn btn-primary explore-more-btn" style={{color: 'white'}}>Explore Marketplace</Button>
              </Link>
            </div>
          </Card>
        </SwiperSlide>
      ))}
    </Swiper>
  );
};
