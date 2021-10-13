import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link, useParams } from 'react-router-dom';
import { CustomSelect } from '../../components/CustomSelect/CustomSelect';
//modules
import {
  activateVault,
  Metadata,
  ParsedAccount,
  useStore,
} from '@oyster/common';
import { useMeta } from '../../contexts';
import { AuctionCard } from '../../components/AuctionCard';
import { ItemList } from '../../components/ItemList';
import { LatestsaleView } from '../latestsale';
import { useCreatorArts, useUserArts } from '../../hooks';
import { CardLoader, ThreeDots } from '../../components/MyLoader';
import { CustomPagination } from '../../components/Pagination/Pagination';
import { Form } from 'react-bootstrap';
import { Button } from 'antd';
import { SafetyDepositDraft } from '../../actions/createAuctionManager';
import {
  useCollection,
  useCollectionTokenMetadataList,
} from '../../hooks/useCollections';
export enum ArtworkViewState {
  Metaplex = 0,
  Owned = 1,
  Created = 3,
}

const ITEMS_PER_PAGE = 9;

export const MarketplaceView = () => {
  const { metadata } = useMeta();
  const [latestsale, setLatestsale] = useState(false);
  const { publicKey } = useWallet();
  const ownedMetadata = useUserArts();
  const createdMetadata = useCreatorArts(publicKey?.toBase58() || '');
  const [activeKey, setActiveKey] = useState(ArtworkViewState.Metaplex);
  const [activePage, setActivPage] = useState(0);
  const [items, setItems] = useState<any>();
  const [pageLen, setPageLen] = useState(90);
  const [onePageItem, setOnePageItem] = useState<
    ParsedAccount<Metadata>[] | SafetyDepositDraft[]
  >([]);
  const { id } = useParams<{ id: string }>();
  const { isLoading, collection, update } = useCollectionTokenMetadataList(id);
  const { collectionData } = useCollection(id);
  const optionData = ['select1', 'select2'];
  useEffect(() => {
    const arr: any = [];
    if (collection) {
      collection.map(item => {
        arr.push(item.ParsedAccount);
      });
      setOnePageItem(arr.slice(activePage * 9, activePage * 9 + 9));
      setPageLen(arr.length);
      setItems(arr);
    }
  }, [collection]);

  // const items = useMemo(() => {
  //   switch (activeKey) {
  //     case ArtworkViewState.Metaplex:
  //       return metadata;
  //     case ArtworkViewState.Owned:
  //       return ownedMetadata;
  //     case ArtworkViewState.Created:
  //       return createdMetadata;
  //   }
  // }, [activeKey, metadata, ownedMetadata, createdMetadata]);

  // const pageLen = useMemo(() => items.length, [items]);

  const onChange = event => {
    setActivPage(event.selected);
    const page = event.selected;
    const data = items.slice(page * 9, page * 9 + 9);
    setOnePageItem(data);
  };

  const handle_latest_sale = () => {
    setLatestsale(!latestsale);
  };

  return (
    <div style={{ margin: '0px 5%' }}>
      {latestsale && <LatestsaleView handle_latest_sale={handle_latest_sale} />}
      <section id="market-sec">
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
                  <strong>{collectionData?.items}</strong>
                  <br />
                  <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                    Items
                  </span>
                </button>
                <button type="button" className="btn btn-secondary text-left">
                  <strong>{collectionData?.owner}</strong>
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
                    <strong>{collectionData?.floorPrice}</strong>
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
                <button
                  type="button"
                  className="btn btn-secondary text-left d-flex align-items-center"
                >
                  <span>
                    <strong>{collectionData?.volumeTraded}</strong>
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
                      />
                    </div>
                    <div className="col-auto">
                      <button
                        className="btn btn-secondary bg-transparent border-0"
                        type="submit"
                      >
                        <img src="/images/bar.png" />
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
            <div className="col-md-4"></div>
          </div>
          <div className="row mt-5">
            <div className="col-md-5">
              <nav aria-label="..." style={{ height: '93%' }}>
                <ul className="pagination m-0 d-flex flex-wrap">
                  <CustomPagination
                    len={pageLen / 9}
                    active={activePage}
                    changePage={event => onChange(event)}
                  />
                </ul>
              </nav>
            </div>
            <div className="col-md-3">
              <div className="dropdown">
                <CustomSelect
                  option={optionData}
                  defoultParam="Price: Low to High"
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="dropdown">
                <CustomSelect option={optionData} defoultParam="Filters" />
              </div>
            </div>
            <div className="col-md-2">
              <div
                className="refresh-button"
                onClick={() => {
                  update();
                }}
              >
                <i className="fas fa-redo-alt"></i>
              </div>
              <a
                href="#"
                onClick={handle_latest_sale}
                type="button"
                className="btn btn-secondary btn-sales"
              >
                <img src="/images/latest_sale.svg" />
                Latest Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="body-sec">
        <div className="container-fluid">
          <div className="row">
            <div className="col-md-8"></div>
            <div className="col-md-4">
              <div className="blur-bg1"></div>
              <div className="d-flex justify-content-between">
                <h3>Item</h3>
                <h3>Price</h3>
              </div>
            </div>
          </div>
          <div className="row">
            <div className="col-md-8">
              <div className="row">
                {!isLoading
                  ? onePageItem.map((m, idx) => {
                      const id = m.pubkey;
                      return (
                        <AuctionCard
                          key={id}
                          pubkey={id}
                          lamports={m.account.lamports}
                        />
                      );
                    })
                  : [...Array(ITEMS_PER_PAGE)].map((_, idx) => (
                      <CardLoader key={idx} />
                    ))}
              </div>
              <img src="/images/cubic-blur.png" className="cubic-blur2" />

              <div className="blur-bg2"></div>
              <div className="row mt-5">
                <div className="col-md-7">
                  <nav aria-label="..." style={{ height: '100%' }}>
                    <ul className="pagination d-flex flex-wrap">
                      <CustomPagination
                        len={pageLen / 9}
                        active={activePage}
                        changePage={event => onChange(event)}
                      />
                    </ul>
                  </nav>
                </div>
                <div className="col-md-5"></div>
              </div>
            </div>
            {/* <!-- Item List starts --> */}
            <div className="col-md-4">
              {!isLoading
                ? onePageItem.map((item, idx) => {
                  const id = item.pubkey
                    return (
                      <ItemList
                        key={id}
                        pubkey={item.pubkey}
                        lamports={item.account.lamports}
                      />
                    );
                  })
                : [...Array(ITEMS_PER_PAGE)].map((_, idx) => (
                    <ThreeDots key={idx} />
                  ))}

              <img src="/images/cubic-blur.png" className="cubic-blur1" />
              {/* <!-- pagination starts --> */}
              <nav aria-label="..." className="mt-5" style={{ height: '40px' }}>
                <ul className="pagination m-0 d-flex flex-wrap">
                  <CustomPagination
                    len={pageLen / 9}
                    active={activePage}
                    changePage={event => onChange(event)}
                  />
                </ul>
              </nav>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
