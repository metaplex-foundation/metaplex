import React from 'react';
import { useCollections } from '../../hooks/useCollections';
import { Link } from 'react-router-dom';
import { Button, Card } from 'react-bootstrap';

export const Collections = () => {
  const { collections } = useCollections();
  return (
    <>
      <div className="allCollections">
        <h1 className="collectionHeader">ALL COLLECTIONS</h1>
        {collections.map((element, i) => (
          <div className="col-md-3 mt-4 collectionCard">
            <Link to={'/marketplace/' + element.collectionName}>
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
          </div>
        ))}
      </div>
    </>
  );
};
