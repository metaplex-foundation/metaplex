import React from 'react';

export const FaqView = () => {
  return (
    <div className="faq-screen">
      <br></br>
      <br></br>
      <br></br>
      <h3 className="Header2 thug-title"> total supply of thugs? </h3>
      <p className="thug-subtitle">there will only be 3333</p>
      <h3 className="Header2 thug-title"> how much will minting be? </h3>
      <p className="thug-subtitle">
        1 SOL for the 1st 1111, <br />
        2 SOL for the 2nd 1111, <br />
        and 3 SOL for the 3rd 1111
      </p>
      <h3 className="Header2 thug-title"> where will i sell my thugs? </h3>
      <p className="thug-subtitle">
        after mint, a marketplace will be available on Solanart.io
      </p>
      <h3 className="Header2 thug-title">
        {' '}
        will i be considered cool if i buy a thug?{' '}
      </h3>
      <p className="thug-subtitle"> you're damn right you will</p>
    </div>
  );
};

export default FaqView;
