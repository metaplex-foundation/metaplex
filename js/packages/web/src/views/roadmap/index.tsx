import React from 'react';

export const RoadmapView = () => {
  return (
    <div className="roadmap-screen bungee-font">
      <br></br>
      <br></br>
      <br></br>
      <h3 className="Header2 thug-title">
        <b>now</b>
      </h3>
      <div>
        <p className="thug-subtitle">release the thugs </p>
        <p className="thug-subtitle">develop AR thugbirdz for each of the 3333 birds in existence </p>
      </div>
      <h3 className="Header2 thug-title">
        <b>wip</b>
      </h3>
      <div>
        <p className="thug-subtitle">launch custom thugbirdz merch</p>
        <p className="thug-subtitle">complete thugbirdz 8-bit RPG nft game</p>
      </div>
      <h3 className="Header2 thug-title">
        {' '}
        <b>next</b>
      </h3>
      <div>
        <p className="thug-subtitle">collabs with other projects</p>
        <p className="thug-subtitle">produce egg NFT's for the OG collection</p>
        <p className="thug-subtitle">release game library as OSS for the Solana community</p>
      </div>
    </div>
  );
}

export default RoadmapView;
