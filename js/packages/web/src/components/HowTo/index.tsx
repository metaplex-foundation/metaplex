import React from 'react';
export const HowTo = () => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <img src="/images/blur-circle.png" className="img-fluid blur-circle" />
      <img src="/images/cubic-blur.png" className="img-fluid cubic-blur" />
      <section id="nft-sec" className="nft-sec">
        <div className="container-fluid d-flex flex-column justify-content-center align-items-center">
          <div className="row">
            <div className="col-md-12 text-center text-white">
              <h1 className="m-0 heading-text">Create and sell your NFTs</h1>
            </div>
          </div>
          <div className="row mt-4 items-rows">
            <div className="col-md-3 text-center ">
              <img src="/images/nft-icon1.png" className="img-fluid" />
              <h5>Setup Your Wallet</h5>
              <p className="m-0">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor Lorem ipsum dolor sit amet, consectetur
                adipiscing elit,
              </p>
            </div>
            <div className="col-md-3 text-center ">
              <img src="/images/nft-icon2.png" className="img-fluid" />
              <h5>Setup Your Wallet</h5>
              <p className="m-0">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor Lorem ipsum dolor sit amet, consectetur
                adipiscing elit,
              </p>
            </div>
            <div className="col-md-3 text-center ">
              <img src="/images/nft-icon3.png" className="img-fluid" />
              <h5>Our Fee</h5>
              <p className="m-0">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor Lorem ipsum dolor sit amet, consectetur
                adipiscing elit,
              </p>
            </div>
            <div className="col-md-3 text-center ">
              <img src="/images/nft-icon4.png" className="img-fluid" />
              <h5>How Does it work?</h5>
              <p className="m-0">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
                eiusmod tempor Lorem ipsum dolor sit amet, consectetur
                adipiscing elit,
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
