import React  from 'react';

const PackSidebar = () => (
  <div className="pack-view__sidebar">
    <h4>Morning</h4>
    <div className="pack-view__info">
      <div className="info-item">
        <p>PACK OF</p>
        <p className="info-count">8 NFTs</p>
      </div>

      <div className="info-item">
        <p>AVAILABLE</p>
        <p className="info-count">12 <span>/ 25</span></p>
      </div>

      <div className="info-item">
        <p>POTENTIAL RARITY</p>
        <p className="info-count">1 of 1000</p>
      </div>
    </div>
    <div className="pack-view__description-block">
      <p className="pack-view__title">DETAILS</p>
      <p  className="pack-view__text">
        Street Dreams is a collective of creators rooted in photography who
        have invested heavily in the art of photography. Co-Founders Michael
        Cobarrubia, Steven Irby, Eric Veloso, have taken their love of photography
        and turned it into a calling for their peers, as well as an rapidly
        expanding publishing and multimedia brand.

        In 2014, with a disruptive approach to the publishing industry,
        SDM launched as a quarterly print publication, with a strong
        focus on crowdsourcing photographic talent online and bringing
        their hundred-thousand strong community offline through magazine
        launches, gallery exhibitions, and mixed-media art shows.
      </p>
    </div>

    <p className="pack-view__title">ARTISTS</p>
    <div className="pack-view__artists">
      <div className="artist">
        <div className="artist__image">
          <img src="/sol-circle.svg" alt="Daniela Spector"/>
        </div>

        <p>Daniela Spector</p>
      </div>
    </div>

    <div className="pack-view__summary">
      <div className="price">
        <p className="pack-view__title">ARTISTS</p>
        <div className="price__info">
          <div className="price__image">
            <img src="/sol-circle.svg" alt="Daniela Spector"/>
          </div>
          <p className="info-sol">1 SOL</p>
          <p>$133.30</p>
        </div>
      </div>

      <button className="pack-view__buy-now">
        <span>Buy Now</span>
      </button>
    </div>
  </div>
)

export default PackSidebar;
