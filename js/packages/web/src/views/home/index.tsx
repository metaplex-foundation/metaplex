import React from 'react';
import { useStore } from '@oyster/common';
import { useMeta } from '../../contexts';
import { Slider } from '../../components/Slider';
import { HowTo } from '../../components/HowTo';
import { RecentSale } from '../../components/RecentSale';
export const HomeView = () => {
  const { isLoading, store } = useMeta();
  const { isConfigured } = useStore();

  return (
    <>
      {/* <Layout style={{ margin: 0, marginTop: 30, alignItems: 'center' }}>
        {showAuctions ? <AuctionListView /> : <SetupView />}
      </Layout> */}
      <div className="hero-section">
        <section id="top-slider-sec">
          <div className="container-fluid">
            <div className="row">
              <div className="col-md-2"></div>
              <div className="col-md-8 text-center hero-text">
                <h1 className="mt-0 ">Discover, Collect and Trade NFTs</h1>
                <p>
                  NINJA-PLEX Lorem ipsum dolor sit amet, consectetur adipiscing
                  elit,
                  <br /> sed do eiusmod tempor incididunt ut labore et dolore
                  magna aliqua.
                  <br /> Ut enim ad minim veniam, quis nostrud exercitation
                  ullamco laboris <br /> nisi ut aliquip ex ea commodo
                  consequat.
                </p>
                <div className="blur-bg1"></div>
              </div>
              <div className="col-md-2"></div>
            </div>
            {/* slider */}

            <div id="topcarousel" className="mt-4 text-center">
              <Slider />
            </div>
          </div>
        </section>
        <HowTo />
        <RecentSale />
      </div>
    </>
  );
};
