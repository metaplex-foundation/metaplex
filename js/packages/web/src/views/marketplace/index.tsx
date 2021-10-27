import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect';
import { AuctionCard } from '../../components/AuctionCard';
import { CustomPagination } from '../../components/Pagination/Pagination';
import { Spinner } from 'react-bootstrap';
import { useCollection } from '../../hooks/useCollections';
import { getCollection } from '../../hooks/getData';

export enum ArtworkViewState {
  Metaplex = 0,
  Owned = 1,
  Created = 3,
}

let ownerLen = 0;
let searchItem = '';
let allAuction = 0;
let pageSize = 16;
let activePage = 0;
let isLoading = false;
let minPrice = 0;
let maxPrice = 0;
let pageLen = 0;
let lowToHigh = 'Price: Low to High';
export const MarketplaceView = () => {
  const [onePageItem, setOnePageItem] = useState<any>([]);
  const [allItems, setAllItems] = useState<any>([]);

  const { id } = useParams<{ id: string }>();
  const [collectionUpdate, setCollectionUpdate] = useState(0);
  const { collectionData } = useCollection(id);

  const optionData = ['Price: Low to High', 'Price: High to Low'];
  const optionDataFilter = [4, 8, 16, 32, 64, 128];

  useEffect(() => {
    if (!id) return;
    getCollection(id).then(data => {
      sortCollection(data);
    });
  }, [lowToHigh, id, collectionUpdate]);

  const sortToPrice = (arr: any) => {
    return arr.sort((a, b) => {
      return a.account.price - b.account.price;
    });
  };

  const sortCollection = collection => {
    let arr: any = [];
    const nft: any = [];
    let max = 0;
    let min = 0;
    let owner: any = [];

    collection?.map(item => {
      if (item.info.auction && !!item.account.price) {
        arr.push(item);
        if (item.account.price > max) max = item.account.price;
        if (item.account.price < min) min = item.account.price;
        const ownerHasAddress = owner.includes(item.authority);
        if (!ownerHasAddress) owner.push(item.authority);
      } else nft.push(item);
    });

    allAuction = arr.length;
    setAllItems(collection);
    if (lowToHigh == 'Price: High to Low') {
      arr = sortToPrice(arr);
    } else if (lowToHigh == 'Price: Low to High') {
      arr = sortToPrice(arr);
      arr = arr.reverse();
    }
    const onePage = arr.slice(
      activePage * pageSize,
      activePage * pageSize + pageSize,
    );
    maxPrice = max;
    ownerLen = owner.length;
    pageLen = arr.length;
    minPrice = min;
    setOnePageItem([]);
    setOnePageItem(onePage);
  };

  const onChange = event => {
    activePage = event.selected;
  };

  const changeSearch = () => {
    const arr: any = [];
    const search = searchItem.toUpperCase();
    allItems.map(item => {
      const name = item.info.data.name.toUpperCase();
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
                          sortCollection(allItems);
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
                    sortCollection(allItems);
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
                    sortCollection(allItems);
                  }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <div
                className="refresh-button"
                onClick={() => {
                  setCollectionUpdate(collectionUpdate + 1);
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
                      const id = m.pubkey;

                      return (
                        <AuctionCard
                          keys={idx || 9000}
                          auction={m.info.auction}
                          price={m.account.price}
                          nftPubkey={m.account.metadata}
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
                              sortCollection(collectionUpdate + 1);
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
