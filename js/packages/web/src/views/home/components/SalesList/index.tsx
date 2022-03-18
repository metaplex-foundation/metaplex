import { useWallet } from '@solana/wallet-adapter-react';
import { Col, Layout, Row, Tabs } from 'antd';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';

import { useMeta } from '../../../../contexts';
import { CardLoader } from '../../../../components/MyLoader';
import { Banner } from '../../../../components/Banner';
import { HowToBuyModal } from '../../../../components/HowToBuyModal';

import { useAuctionsList } from './hooks/useAuctionsList';
import { AuctionRenderCard } from '../../../../components/AuctionRenderCard';

const { TabPane } = Tabs;
const { Content } = Layout;

export enum LiveAuctionViewState {
  All = '0',
  Participated = '1',
  Ended = '2',
  Resale = '3',
  Own = '4',
}

export const SalesListView = () => {
  const [activeKey, setActiveKey] = useState(LiveAuctionViewState.All);
  const { isLoading } = useMeta();
  const { connected } = useWallet();
  const { auctions, hasResaleAuctions } = useAuctionsList(activeKey);

  return (
    <>
      
     

      <Row>
        <section className="banner-section" style={{ backgroundImage: `url("/images/banner/bg-1.jpg")` }}>
        <div className="container">
            <div className="banner-wrapper">
                <div className="row align-items-center g-5">
                    <div className="col-lg-7">
                        <div className="banner-content">
                            <h1 className="mb-3"><span className="gradient-text-orange">Discover</span> , Trade, collect, and
                                sell
                                <span className="gradient-text-orange">
                                    NFTs</span>
                            </h1>
                            <p className="mb-5">Digital Marketplace For Crypto Collectibles And Non-Fungible Tokens.
                                Buy, Sell, And Discover Exclusive Digital Assets.</p>
                            <div className="banner-btns d-flex flex-wrap">
                                <a href="coming-soon.html" className="default-btn move-top"><span>Explore</span> </a>
                                <a href="coming-soon.html" className="default-btn move-right"><span>Create</span> </a>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-5">
                        <div className="swiper banner-slider swiper-creative swiper-3d swiper-initialized swiper-horizontal swiper-pointer-events">
                            <div className="swiper-wrapper">
                            <div className="swiper-slide swiper-slide-duplicate swiper-slide-duplicate-next">
                            <div className="nft-item">
                                        <div className="nft-inner">
                                            {/* nft top part */}
                                            <div className="nft-item-top d-flex justify-content-between align-items-center">
                                                <div className="author-part">
                                                    <ul className="author-list d-flex">
                                                        <li className="single-author">
                                                            <a href="coming-soon.html"></a>
                                                        </li>
                                                        <li className="single-author d-flex align-items-center">
                                                            <a href="coming-soon.html" className="veryfied">
                                                            <img src="/images/seller/collector-6.png" alt="author-img"/></a>
                                                            <h6><a href="coming-soon.html">Gold (Access Pass)</a></h6>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="more-part">
                                                    <div className=" dropstart">
                                                        <a className=" dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="25,0">
                                                            <i className="icofont-flikr"></i>
                                                        </a>

                                                        <ul className="dropdown-menu">
                                                            <li><a className="dropdown-item" href="#"><span>
                                                                        <i className="icofont-warning"></i>
                                                                    </span> Report </a>
                                                            </li>
                                                            <li><a className="dropdown-item" href="#"><span><i className="icofont-reply"></i></span> Share</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            {/*  nft-bottom part */}
                                            <div className="nft-item-bottom">
                                                <div className="nft-thumb">
                                                    <img src="/images/nft-item/03.jpg" alt="nft-img"/>

                                                    {/*  nft countdwon */}
                                                    {/*  <ul className="nft-countdown count-down" data-date="May 05, 2022 21:14:01">
                                                                                                    <li>
                                                                                                        <span className="days">34</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="hours">09</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="minutes">32</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="seconds">32</span>
                                                                                                    </li>
                                                                                                </ul> */}
                                                    <span className="badge rounded-pill position-absolute"><i className="icofont-heart"></i>
                                                        4.3k</span>
                                                </div>
                                                <div className="nft-content">
                                                    <div className="content-title">
                                                        <h5><a href="coming-soon.html">Gold NFT Access Pass for GoatZ Token </a> </h5>
                                                    </div>

                                                    <div className="nft-status d-flex flex-wrap justify-content-between align-items-center ">
                                                        <span className="nft-view"><a href="coming-soon.html"><i className="icofont-eye-alt"></i> View
                                                                History</a> </span>
                                                        <div className="nft-stock"> 5 in Stock</div>
                                                    </div>
                                                    <div className="price-like d-flex justify-content-between align-items-center">
                                                        <div className="nft-price d-flex align-items-center">
                                                            <span className="currency-img">
                                                                <img src="/images/currency/currency-3.png" alt="currency img"/>
                                                            </span>
                                                            <p>0.64 ETH
                                                            </p>
                                                        </div>

                                                        <a href="coming-soon.html" className="nft-bid">Place Bid</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <div className="swiper-slide-shadow" ></div></div>
                                <div className="swiper-slide swiper-slide-prev" >
                                <div className="nft-item">
                                        <div className="nft-inner">
                                            {/*  nft top part */}
                                            <div className="nft-item-top d-flex justify-content-between align-items-center">
                                                <div className="author-part">
                                                    <ul className="author-list d-flex">
                                                        <li className="single-author">
                                                            <a href="coming-soon.html"><img src="/images/seller/collector-5.png" alt="author-img"/></a>
                                                        </li>
                                                        <li className="single-author d-flex align-items-center">
                                                            <a href="coming-soon.html" className="veryfied"><img src="/images/seller/collector-4.gif" alt="author-img"/></a>
                                                            <h6><a href="coming-soon.html">Spider-Man</a></h6>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="more-part">
                                                    <div className=" dropstart">
                                                        <a className=" dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="25,0">
                                                            <i className="icofont-flikr"></i>
                                                        </a>

                                                        <ul className="dropdown-menu">
                                                            <li><a className="dropdown-item" href="#"><span>
                                                                        <i className="icofont-warning"></i>
                                                                    </span> Report </a>
                                                            </li>
                                                            <li><a className="dropdown-item" href="#"><span><i className="icofont-reply"></i></span> Share</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            {/*  nft-bottom part */}
                                            <div className="nft-item-bottom">
                                                <div className="nft-thumb">
                                                    <img src="/images/nft-item/05.jpg" alt="nft-img"/>

                                                    {/*  nft countdwon */}
                                                    {/*  <ul className="nft-countdown count-down" data-date="May 05, 2022 21:14:01">
                                                                                <li>
                                                                                    <span className="days">34</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="hours">09</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="minutes">32</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="seconds">32</span>
                                                                                </li>
                                                                            </ul> */}
                                                    <span className="badge rounded-pill position-absolute"><i className="icofont-heart"></i>
                                                        1.3k</span>
                                                </div>
                                                <div className="nft-content">
                                                    <div className="content-title">
                                                        <h5><a href="coming-soon.html">NFT Marketplace Coming Soon</a> </h5>
                                                    </div>

                                                    <div className="nft-status d-flex flex-wrap justify-content-between align-items-center ">
                                                        <span className="nft-view"><a href="coming-soon.html"><i className="icofont-eye-alt"></i> View
                                                                History</a> </span>
                                                        <div className="nft-stock"> 12 in Stock</div>
                                                    </div>
                                                    <div className="price-like d-flex justify-content-between align-items-center">
                                                        <div className="nft-price d-flex align-items-center">
                                                            <span className="currency-img">
                                                                <img src="/images/currency/currency-3.png" alt="currency img"/>
                                                            </span>
                                                            <p>0.34 ETH
                                                            </p>
                                                        </div>

                                                        <a href="coming-soon.html" className="nft-bid">Place Bid</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <div className="swiper-slide-shadow"></div></div>
                                <div className="swiper-slide swiper-slide-visible swiper-slide-active" ><div className="nft-item">
                                        <div className="nft-inner">
                                            {/*  nft top part */}
                                            <div className="nft-item-top d-flex justify-content-between align-items-center">
                                                <div className="author-part">
                                                    <ul className="author-list d-flex">
                                                        <li className="single-author">
                                                            <a href="coming-soon.html"></a>
                                                        </li>
                                                        <li className="single-author d-flex align-items-center">
                                                            <a href="coming-soon.html" className="veryfied"><img src="/images/seller/collector-4.png" alt="author-img"/></a>
                                                            <h6><a href="coming-soon.html">Silver (Access Pass)</a></h6>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="more-part">
                                                    <div className=" dropstart">
                                                        <a className=" dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="25,0">
                                                            <i className="icofont-flikr"></i>
                                                        </a>

                                                        <ul className="dropdown-menu">
                                                            <li><a className="dropdown-item" href="#"><span>
                                                                        <i className="icofont-warning"></i>
                                                                    </span> Report </a>
                                                            </li>
                                                            <li><a className="dropdown-item" href="#"><span><i className="icofont-reply"></i></span> Share</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            {/*  nft-bottom part */}
                                            <div className="nft-item-bottom">
                                                <div className="nft-thumb">
                                                    <img src="/images/nft-item/02.jpg" alt="nft-img"/>

                                                    {/*  nft countdwon */}
                                                    {/*  <ul className="nft-countdown count-down" data-date="May 05, 2022 21:14:01">
                                                                                                    <li>
                                                                                                        <span className="days">34</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="hours">09</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="minutes">32</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="seconds">32</span>
                                                                                                    </li>
                                                                                                </ul> */}
                                                    <span className="badge rounded-pill position-absolute"><i className="icofont-heart"></i>
                                                        1.3k</span>
                                                </div>
                                                <div className="nft-content">
                                                    <div className="content-title">
                                                        <h5><a href="coming-soon.html">Silver NFT Access Pass for GoatZ Token </a> </h5>
                                                    </div>

                                                    <div className="nft-status d-flex flex-wrap justify-content-between align-items-center ">
                                                        <span className="nft-view"><a href="coming-soon.html"><i className="icofont-eye-alt"></i> View
                                                                History</a> </span>
                                                        <div className="nft-stock"> 12 in Stock</div>
                                                    </div>
                                                    <div className="price-like d-flex justify-content-between align-items-center">
                                                        <div className="nft-price d-flex align-items-center">
                                                            <span className="currency-img">
                                                                <img src="/images/currency/currency-3.png" alt="currency img"/>
                                                            </span>
                                                            <p>0.34 ETH
                                                            </p>
                                                        </div>

                                                        <a href="coming-soon.html" className="nft-bid">Place Bid</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <div className="swiper-slide-shadow"></div></div>
                                <div className="swiper-slide swiper-slide-next" >
                                <div className="nft-item">
                                        <div className="nft-inner">
                                            {/*  nft top part */}
                                            <div className="nft-item-top d-flex justify-content-between align-items-center">
                                                <div className="author-part">
                                                    <ul className="author-list d-flex">
                                                        <li className="single-author">
                                                            <a href="coming-soon.html"></a>
                                                        </li>
                                                        <li className="single-author d-flex align-items-center">
                                                            <a href="coming-soon.html" className="veryfied"><img src="/images/seller/collector-6.png" alt="author-img"/></a>
                                                            <h6><a href="coming-soon.html">Gold (Access Pass)</a></h6>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="more-part">
                                                    <div className=" dropstart">
                                                        <a className=" dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="25,0">
                                                            <i className="icofont-flikr"></i>
                                                        </a>

                                                        <ul className="dropdown-menu">
                                                            <li><a className="dropdown-item" href="#"><span>
                                                                        <i className="icofont-warning"></i>
                                                                    </span> Report </a>
                                                            </li>
                                                            <li><a className="dropdown-item" href="#"><span><i className="icofont-reply"></i></span> Share</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            {/*  nft-bottom part */}
                                            <div className="nft-item-bottom">
                                                <div className="nft-thumb">
                                                    <img src="/images/nft-item/03.jpg" alt="nft-img"/>

                                                    {/*  nft countdwon */}
                                                    {/*  <ul className="nft-countdown count-down" data-date="May 05, 2022 21:14:01">
                                                                                                    <li>
                                                                                                        <span className="days">34</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="hours">09</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="minutes">32</span>
                                                                                                    </li>
                                                                                                    <li>
                                                                                                        <span className="seconds">32</span>
                                                                                                    </li>
                                                                                                </ul> */}
                                                    <span className="badge rounded-pill position-absolute"><i className="icofont-heart"></i>
                                                        4.3k</span>
                                                </div>
                                                <div className="nft-content">
                                                    <div className="content-title">
                                                        <h5><a href="coming-soon.html">Gold NFT Access Pass for GoatZ Token </a> </h5>
                                                    </div>

                                                    <div className="nft-status d-flex flex-wrap justify-content-between align-items-center ">
                                                        <span className="nft-view"><a href="coming-soon.html"><i className="icofont-eye-alt"></i> View
                                                                History</a> </span>
                                                        <div className="nft-stock"> 5 in Stock</div>
                                                    </div>
                                                    <div className="price-like d-flex justify-content-between align-items-center">
                                                        <div className="nft-price d-flex align-items-center">
                                                            <span className="currency-img">
                                                                <img src="/images/currency/currency-3.png" alt="currency img"/>
                                                            </span>
                                                            <p>0.64 ETH
                                                            </p>
                                                        </div>

                                                        <a href="coming-soon.html" className="nft-bid">Place Bid</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <div className="swiper-slide-shadow"></div></div>
                            <div className="swiper-slide swiper-slide-duplicate swiper-slide-duplicate-prev">  <div className="nft-item">
                                        <div className="nft-inner">
                                            {/*  nft top part */}
                                            <div className="nft-item-top d-flex justify-content-between align-items-center">
                                                <div className="author-part">
                                                    <ul className="author-list d-flex">
                                                        <li className="single-author">
                                                            <a href="coming-soon.html"><img src="/images/seller/collector-5.png" alt="author-img"/></a>
                                                        </li>
                                                        <li className="single-author d-flex align-items-center">
                                                            <a href="coming-soon.html" className="veryfied"><img src="/images/seller/collector-4.gif" alt="author-img"/></a>
                                                            <h6><a href="coming-soon.html">Spider-Man</a></h6>
                                                        </li>
                                                    </ul>
                                                </div>
                                                <div className="more-part">
                                                    <div className=" dropstart">
                                                        <a className=" dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-offset="25,0">
                                                            <i className="icofont-flikr"></i>
                                                        </a>

                                                        <ul className="dropdown-menu">
                                                            <li><a className="dropdown-item" href="#"><span>
                                                                        <i className="icofont-warning"></i>
                                                                    </span> Report </a>
                                                            </li>
                                                            <li><a className="dropdown-item" href="#"><span><i className="icofont-reply"></i></span> Share</a>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                            {/*  nft-bottom part */}
                                            <div className="nft-item-bottom">
                                                <div className="nft-thumb">
                                                    <img src="/images/nft-item/05.jpg" alt="nft-img"/>

                                                    {/*  nft countdwon */}
                                                    {/*  <ul className="nft-countdown count-down" data-date="May 05, 2022 21:14:01">
                                                                                <li>
                                                                                    <span className="days">34</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="hours">09</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="minutes">32</span>
                                                                                </li>
                                                                                <li>
                                                                                    <span className="seconds">32</span>
                                                                                </li>
                                                                            </ul> */}
                                                    <span className="badge rounded-pill position-absolute"><i className="icofont-heart"></i>
                                                        1.3k</span>
                                                </div>
                                                <div className="nft-content">
                                                    <div className="content-title">
                                                        <h5><a href="coming-soon.html">NFT Marketplace Coming Soon</a> </h5>
                                                    </div>

                                                    <div className="nft-status d-flex flex-wrap justify-content-between align-items-center ">
                                                        <span className="nft-view"><a href="coming-soon.html"><i className="icofont-eye-alt"></i> View
                                                                History</a> </span>
                                                        <div className="nft-stock"> 12 in Stock</div>
                                                    </div>
                                                    <div className="price-like d-flex justify-content-between align-items-center">
                                                        <div className="nft-price d-flex align-items-center">
                                                            <span className="currency-img">
                                                                <img src="/images/currency/currency-3.png" alt="currency img"/>
                                                            </span>
                                                            <p>0.34 ETH
                                                            </p>
                                                        </div>

                                                        <a href="coming-soon.html" className="nft-bid">Place Bid</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                <div className="swiper-slide-shadow"></div></div></div>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true">
                        </span><span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span>
                        <span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span><span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span><span className="swiper-notification" aria-live="assertive" aria-atomic="true"></span></div>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/*  ===============//banner section end here \\================= */}
 
     </Row>
    <Row>
      {/* ===============>>Catergory section start here <<================= */}
    <section className="catergory-section padding-top padding-bottom">
        <div className="container">
            <div className="section-header">
                <h3 className="header-title">Browse By Category</h3>
                <div className="header-content"><a href="explore-2.html" className="default-btn style-2 small-btn move-right"><span>View All
                            <i className="icofont-circled-right"></i></span></a> </div>
            </div>
            <div className="category-wrapper">
                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-5">
                    <div className="col">
                        <div className="cat-item">
                            <div className="cat-inner">
                                <div className="cat-thumb">
                                    <img src="/images/category/cat-1.png" alt="Category Image"/>
                                </div>
                                <div className="cat-content">
                                    <h6><a href="category-single.html">Actors</a></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="cat-item">
                            <div className="cat-inner">
                                <div className="cat-thumb">
                                    <img src="/images/category/cat-2.png" alt="Category Image"/>
                                </div>
                                <div className="cat-content">
                                    <h6><a href="category-single.html">Musicians</a></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="cat-item">
                            <div className="cat-inner">
                                <div className="cat-thumb">
                                    <img src="/images/category/cat-3.png" alt="Category Image"/>
                                </div>
                                <div className="cat-content">
                                    <h6><a href="category-single.html">Giveaways</a></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="cat-item">
                            <div className="cat-inner">
                                <div className="cat-thumb">
                                    <img src="/images/category/cat-4.png" alt="Category Image"/>
                                </div>
                                <div className="cat-content">
                                    <h6><a href="category-single.html">Athletes</a></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col">
                        <div className="cat-item">
                            <div className="cat-inner">
                                <div className="cat-thumb">
                                    <img src="/images/category/cat-5.png" alt="Category Image"/>
                                </div>
                                <div className="cat-content">
                                    <h6><a href="category-single.html">Collectibles</a></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    
                    
                </div>
            </div>
        </div>
    </section>
    {/* ===============>>Catergory section end here <<================= */}

    </Row>

      <Layout>
        <Content style={{ display: 'flex', flexWrap: 'wrap' }}>
          <Col style={{ width: '100%', marginTop: 32 }}>
            <Row>
              <Tabs
                activeKey={activeKey}
                onTabClick={key => setActiveKey(key as LiveAuctionViewState)}
              >
                <TabPane
                  tab={
                    <>
                      <span className="live"></span> Live
                    </>
                  }
                  key={LiveAuctionViewState.All}
                ></TabPane>
                {hasResaleAuctions && (
                  <TabPane
                    tab="Secondary Marketplace"
                    key={LiveAuctionViewState.Resale}
                  ></TabPane>
                )}
                <TabPane tab="Ended" key={LiveAuctionViewState.Ended}></TabPane>
                {connected && (
                  <TabPane
                    tab="Participated"
                    key={LiveAuctionViewState.Participated}
                  ></TabPane>
                )}
                {connected && (
                  <TabPane
                    tab="My Live Auctions"
                    key={LiveAuctionViewState.Own}
                  ></TabPane>
                )}
              </Tabs>
            </Row>
            <Row>
              <div className="artwork-grid">
                {isLoading &&
                  [...Array(10)].map((_, idx) => <CardLoader key={idx} />)}
                {!isLoading &&
                  auctions.map(auction => (
                    <Link
                      key={auction.auction.pubkey}
                      to={`/auction/${auction.auction.pubkey}`}
                    >
                      <AuctionRenderCard auctionView={auction} />
                    </Link>
                  ))}
              </div>
            </Row>
          </Col>

          <Col>
          <Row>
          
   
    {/* ===============//auction section start here \\================= */}
   
    {/* ===============//auction section end here \\================= */}



    {/* ===============//seller section start here \\================= */}
    <section className="seller-section pb-100">
        <div className="container">
            <div className="section-header">
                <h3 className="header-title">Top Collectors</h3>
                <div className="header-content">
                    <ul className="filter-group d-flex flex-wrap align-items-center">
                        <li className="li collection-filter">
                            <div className="select-wrapper arrow-blue" data-icon="">
                                <select className="form-select " aria-label="Collection select">
                                    <option selected="">Collections</option>
                                    <option value="1">Newest</option>
                                    <option value="2">Trending</option>
                                    <option value="3">Most Popular</option>
                                </select>
                            </div>
                        </li>
                        <li className="li day-filter">
                            <div className="select-wrapper arrow-orange" data-icon="">
                                <select className="form-select" aria-label="Day select">
                                    <option selected="">Last 7 Days</option>
                                    <option value="1">Last 15 Day</option>
                                    <option value="2">Last Month</option>
                                    <option value="3">All Time</option>
                                </select>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="section-wrapper">
                <div className="seller-wrapper">
                    <div className="row g-3">
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">01</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html" className=""><img src="/images/seller/collector-2.gif" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">@Ndrea _uido</a> </h6>
                                                <p>2.98 ETH</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+38.78%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">02</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-1.png" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">goxio dom</a> </h6>
                                                <p>$12,002.48</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-orange">-2.78%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">03</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-2.png" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">pter qido</a> </h6>
                                                <p>$3,002.98</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+18.8%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">04</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-8.png" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">drexa_3xo</a> </h6>
                                                <p>$2,300.98</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-orange"> -23.81%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">05</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-6.png" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">rox zipper</a> </h6>
                                                <p>2.02 ETH</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+48.38%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">06</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-3.gif" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="#">@Anra-_uido</a> </h6>
                                                <p>$17,02.98</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-orange">-8.78%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">07</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-4.gif" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">rassel_mrh </a> </h6>
                                                <p>.98 ETH</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+88.78%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">08</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-7.png" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="coming-soon.html">holder don</a> </h6>
                                                <p>$23,002.98</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+3.7%</span>
                                </div>
                            </div>
                        </div>
                        <div className="col-xl-4 col-lg-6">
                            <div className="seller-item">
                                <div className="seller-inner">
                                    <div className="seller-part">
                                        <p className="assets-number">09</p>
                                        <div className="assets-owner">
                                            <div className="owner-thumb veryfied">
                                                <a href="coming-soon.html"><img src="/images/seller/collector-1.gif" alt="seller-img"/></a>
                                            </div>
                                            <div className="owner-content">
                                                <h6><a href="#">rub_3l</a> </h6>
                                                <p>$8,702.98</p>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="badge rounded-pill bg-blue">+31.78%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="text-center mt-5">
                        <a href="coming-soon.html" className="default-btn move-right"><span>Go To Rank</span></a>
                    </div>
                </div>
            </div>
        </div>
    </section>
    {/* ===============//seller section end here \\================= */}



    {/* ===============>> Artwork section start here <<================= */}
    <section className="artwork-section">
        
    </section>
    {/* ===============>> Artwork section end here <<================= */}

    </Row>
    </Col>





        </Content>
      </Layout>

          <Col style={{ width: '100%', marginTop: 32 }}>
    <Row style={{ width: '100%',
height: '110vh',
display: 'flex',
flexDirection: 'column',
alignItems: 'center',
justifyContent: 'center',
}}>


    {/* ===============//blog section start here \\================= */}
    
    {/* ===============//blog section end here \\================= */}



    {/* ===============//footer section start here \\================= */}
    <footer className="footer-section">
        <div className="footer-top" style={{ backgroundImage: `url("/images/footer/bg.jpg")` }}> 
            <div className="footer-newsletter">
                <div className="container">
                    <div className="row g-4 align-items-center justify-content-center">
                        <div className="col-lg-6">
                            <div className="newsletter-part">
                                <div className="ft-header">
                                    <h4>Get The Latest Anftiz Updates</h4>
                                </div>
                                <form action="#">
                                    <input type="email" placeholder="Your Mail Address"/>
                                    <button type="submit"> Subscribe now</button>
                                </form>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="social-part ps-lg-5">
                                <div className="ft-header">
                                    <h4>Join the Community</h4>
                                </div>
                                <ul className="social-list d-flex flex-wrap align-items-center mb-0">
                                    <li className="social-link"><a href="#"><i className="icofont-twitter"></i></a></li>
                                    <li className="social-link"><a href="#"><i className="icofont-twitch"></i></a></li>
                                    <li className="social-link"><a href="#"><i className="icofont-reddit"></i></a></li>
                                    <li className="social-link"><a href="#"><i className="icofont-instagram"></i></a></li>
                                    <li className="social-link"><a href="#"><i className="icofont-dribble"></i></a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
             <div className="footer-links padding-top padding-bottom">
                <div className="container">
                    <div className="row g-5">
                        <div className="col-lg-3 col-md-6">
                            <div className="footer-link-item">
                                <h5>About</h5>
                                <ul className="footer-link-list">
                                    <li><a href="#" className="footer-link">Explore</a></li>
                                    <li><a href="#" className="footer-link">How it works</a></li>
                                    <li><a href="#" className="footer-link">Support</a></li>
                                    <li><a href="#" className="footer-link">Become a partner</a></li>

                                </ul>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="footer-link-item">
                                <h5>Company</h5>
                                <ul className="footer-link-list">
                                    <li><a href="#" className="footer-link">About</a></li>
                                    <li><a href="#" className="footer-link">Mission &amp; Team</a></li>
                                    <li><a href="#" className="footer-link">Our Blog</a></li>
                                    <li><a href="#" className="footer-link">Services</a></li>
                                    <li><a href="#" className="footer-link">We're Hiring</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="footer-link-item">
                                <h5>NFT Marketplace</h5>
                                <ul className="footer-link-list">
                                    <li><a href="#" className="footer-link">Sell your assets</a></li>
                                    <li><a href="#" className="footer-link">FAQ</a></li>
                                    <li><a href="#" className="footer-link">Support</a></li>
                                    <li><a href="#" className="footer-link">Privacy/Policy</a></li>
                                    <li><a href="#" className="footer-link">Your purchases</a></li>
                                </ul>
                            </div>
                        </div>
                        <div className="col-lg-3 col-md-6">
                            <div className="footer-link-item">
                                <h5>Comunity</h5>
                                <ul className="footer-link-list">
                                    <li><a href="#" className="footer-link">NFT Token</a></li>
                                    <li><a href="#" className="footer-link">Discusion</a></li>
                                    <li><a href="#" className="footer-link">Voting</a></li>
                                    <li><a href="#" className="footer-link">Suggest Feature</a></li>
                                    <li><a href="#" className="footer-link">Language</a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>   
        </div>
        <div className="footer-bottom">
            <div className="container">
                <p className="text-center py-4 mb-0">All rights reserved © GOATZ.IO || Design By: <a href="https://alexamediamarketing.com">Alexa Media Marketing</a>
                </p>
            </div>
        </div>
    </footer>
    {/* ===============//footer section end here \\================= */}
    </Row>
    </Col>
    </>
  );
};
