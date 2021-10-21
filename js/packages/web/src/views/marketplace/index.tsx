import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { AuctionCard } from '../../components/AuctionCard';
import { CustomPagination } from '../../components/Pagination/Pagination';
import { Spinner } from 'react-bootstrap';
import {
  useCollection,
  useCollectionTokenMetadataList,
} from '../../hooks/useCollections';
export enum ArtworkViewState {
  Metaplex = 0,
  Owned = 1,
  Created = 3,
}

let ownerLen = 0;
let lowToHigh = 'Price: Low to High';
let onePageItem: any = [];
let pageLen = 0;
let searchItem = '';
let allItems: any = [];
let allAuction = 0;
let pageSize = 16;
let activePage = 0;

export const MarketplaceView = () => {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const { id } = useParams<{ id: string }>();

  const { isLoading, collection, update } = useCollectionTokenMetadataList(id);
  const { collectionData } = useCollection(id);

  const optionData = ['Price: Low to High', 'Price: High to Low'];
  const optionDataFilter = [4, 8, 16, 32, 64, 128];

  useEffect(() => {
    if (collection) {
      sortCollection(collection);
    } else if (!isLoading) pageLen = 0;
  }, [collection, isLoading]);

  const sortToPrice = (arr: any) => {
    return arr.sort((a, b) => {
      return a.Price - b.Price;
    });
  };

  const sortCollection = collection => {
    let arr: any = [];
    const nft: any = [];
    let max = 0;
    let min = 0;
    let owner: any = [];

    collection.map(item => {
      if (item['Auction']) {
        arr.push(item);
        if (item.Price > max) max = item.Price;
        if (item.Price < min) min = item.Price;
        const ownerHasAddress = owner.includes(
          item.ParsedAccount.info.data.creators[0].address,
        );
        if (!ownerHasAddress)
          owner.push(item.ParsedAccount.info.data.creators[0].address);
      } else nft.push(item);
    });
    allAuction = arr.length;
    allItems = collection;

    if (searchItem) arr = changeSearch();
    if (lowToHigh == 'Price: Low to High') {
      arr = sortToPrice(arr);
    } else if (lowToHigh == 'Price: High to Low') {
      arr = sortToPrice(arr);
      arr = arr.reverse();
    }

    const onePage = arr.slice(
      activePage * pageSize,
      activePage * pageSize + pageSize,
    );
    onePageItem = onePage;
    ownerLen = owner.length;
    pageLen = arr.length;
    setMinPrice(min);
    setMaxPrice(max);
  };

  const onChange = event => {
    activePage = event.selected;
    update();
  };

  const changeSearch = () => {
    const arr: any = [];
    const search = searchItem.toUpperCase();
    allItems.map(item => {
      const name = item.ParsedAccount.info.data.name.toUpperCase();
      if (name.search(search) >= 0) arr.push(item);
    });
    return arr;
  };

  return (
    <div style={{ margin: '0px auto' }} className="col-md-10">
      <div id="market-sec" className="col-md-10">
        <div className="container-fluid">
          <div className="row">
            <div className="col-2">
              <img src={collectionData?.image} className="mt-4 container-img" />
            </div>
            <div className="col-md-6">
              <h1 className="mt-0">{collectionData?.collectionName}</h1>
              <div
                className="btn-group mb-3"
                role="group"
                aria-label="Basic example"
              >
                <button type="button" className="btn btn-secondary text-left">
                  <strong>{allAuction}</strong>
                  <br />
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Items
                  </span>
                </button>
                <button type="button" className="btn btn-secondary text-left">
                  <strong>{ownerLen}</strong>
                  <br />
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Owner
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-left d-flex align-items-center"
                >
                  <span>
                    <strong>{maxPrice}</strong>
                    <br />
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Max Price
                    </span>
                  </span>{' '}
                  <img
                    src="/images/exchange-white.png"
                    className="ml-3 exchange-white"
                  />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary text-left d-flex align-items-center"
                >
                  <span>
                    <strong>{minPrice}</strong>
                    <br />
                    <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                      Floor Price
                    </span>
                  </span>{' '}
                  <img
                    src="/images/exchange-white.png"
                    className="ml-3 exchange-white"
                  />
                </button>
              </div>
              <div className="bottom-sec d-flex">
                <div
                  className="btn-group"
                  role="group"
                  aria-label="Basic example"
                >
                  <button type="button" className="btn btn-secondary">
                    <a href={collectionData?.twitterUrl} target="_blank">
                      <img src="/images/twit1.png" />
                    </a>
                  </button>
                  <button type="button" className="btn btn-secondary">
                    <a href={collectionData?.discordUrl} target="_blank">
                      <img src="/images/twit3.png" />
                    </a>
                  </button>
                  <button type="button" className="btn btn-secondary">
                    <a href={collectionData?.daringDragonsUrl} target="_blank">
                      <img src="/images/twit2.png" />
                    </a>
                  </button>
                </div>
                <form className="card card-sm ml-4">
                  <div className="card-body row no-gutters align-items-center p-0">
                    <div className="col-auto">
                      <i className="fa fa-search" aria-hidden="true"></i>
                    </div>
                    <div className="col">
                      <input
                        className="form-control"
                        type="search"
                        placeholder=""
                        value={searchItem}
                        onChange={event => {
                          activePage = 0;
                          searchItem = event.target.value;
                          update();
                        }}
                      />
                    </div>
                    <div className="col-auto">
                      <div className="btn btn-secondary bg-transparent border-0">
                        <img src="/images/bar.png" />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            <div className="col-md-4"></div>
          </div>
          <div className="row mt-5" style={{ justifyContent: 'end' }}>
            <div className="col-md-3">
              <div className="dropdown">
                <CustomSelect
                  option={optionData}
                  defaultParam="Price: Low to High"
                  onChange={event => {
                    lowToHigh = event.target.value;
                    update();
                  }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="dropdown">
                <CustomSelect
                  option={optionDataFilter}
                  defaultParam={`${pageSize}`}
                  onChange={event => {
                    pageSize = parseFloat(event.target.value);
                    activePage = 0;
                    update();
                  }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <div
                className="refresh-button"
                onClick={() => {
                  if (!isLoading) update();
                }}
              >
                <i className="fas fa-redo-alt"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="body-sec">
        <div className="container-fluid">
          <div className="row">
            <div
              className="col-md-10"
              style={{
                display: 'flex',
                flexDirection: 'column',
                margin: '0 auto',
              }}
            >
              <div className="row">
                {!isLoading ? (
                  onePageItem.length > 0 ? (
                    onePageItem.map((m, idx) => {
                      const id = m.ParsedAccount.pubkey;
                      return (
                        <AuctionCard
                          pubkey={id}
                          auction={m.Auction}
                          price={m.Price}
                        />
                      );
                    })
                  ) : (
                    <div className="emptyMarketplace">
                      THIS MARKETPLACE IS EMPTY
                    </div>
                  )
                ) : (
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden"></span>
                  </Spinner>
                )}
              </div>

              <div className="blur-bg2"></div>
              {pageLen / pageSize > 1 ? (
                <div className="row paginateLoadBottom">
                  <div className="col-md-7">
                    <nav aria-label="..." style={{ height: '100%' }}>
                      <ul className="pagination d-flex flex-wrap">
                        <CustomPagination
                          len={pageLen / pageSize}
                          active={activePage}
                          changePage={event => {
                            if (!isLoading) {
                              onChange(event);
                              update();
                            }
                          }}
                        />
                      </ul>
                    </nav>
                  </div>
                </div>
              ) : (
                ''
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
