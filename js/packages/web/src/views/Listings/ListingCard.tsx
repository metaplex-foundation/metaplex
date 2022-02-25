import React from 'react';
import { Skeleton, Row, Image, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { DateTime, Duration } from 'luxon';
// import Image as NextImage from 'next/image';
import { useInView } from 'react-intersection-observer';
import { useAnalytics } from '../../contexts';
import { maybeCDN, maybeImageCDN } from '../../utils/cdn';

const Square = styled(Row)`
  position: relative;
  flex-basis: calc(33.333% - 10px);
  box-sizing: border-box;
  width: 100%;
  height: 100%;

  &:before {
    content: '';
    display: block;
    padding-top: 100%;
  }

  > * {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 100%;
  }

  .ant-image-mask {
    background: rgba(0, 0, 0, 0) !important;
  }
`;

const NFTPreview = styled(Image)<{ $show: boolean }>`
  display: ${({ $show }) => ($show ? 'block' : 'none')};
  object-fit: cover;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  width: 100%;
  height: 100%;
  /* border: solid 1px rgba(255, 255, 255, 0.1); */
`;

// adds the active loading animation to the antd skeleton image
const StyledSkeletonImage = styled(Skeleton.Image)`
  background-size: 400% 100%;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;

  > .ant-skeleton-image > svg {
    display: none;
  }
  width: 100% !important;
  height: 100% !important;
`;

// Going with a full replace of the listing during loading for now, but might revert to swapping individual parts of the component below with its loading state. (as done in a previous commit)
export function SkeletonListing() {
  return (
    <div className="mb-12 pt-1 ">
      <Square>
        <StyledSkeletonImage className="skeleton-animation h-full w-full rounded-t-lg" />
      </Square>

      <div className="border-x border-gray-800 px-4 py-6">
        <div className="flex h-10 w-full items-center justify-between rounded-md bg-[#bebebe33]">
          {/* <Skeleton.Button active block size="large" /> */}
        </div>
      </div>
      <div
        className={classNames(
          'flex items-center justify-between rounded-b-md px-4 py-4',
          'border border-gray-800 ',
        )}
      >
        <div className="h-[42px] w-32  rounded-md bg-[#bebebe33]"></div>
        <div className="h-[42px] w-32  rounded-md bg-[#bebebe33]"></div>
      </div>
    </div>
  );
}

const CustomImageMask = styled.div`
  position: absolute;
  right: 0;
  bottom: 0;
  width: 72px;
  height: 72px; 
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  > svg {
    position absolute;
    right: 16px;
    bottom: 16px;

  }
`;

// returns lamports
export function getListingPrice(listing: Listing) {
  return (
    (listing.highestBid
      ? listing.highestBid
      : listing.priceFloor
      ? listing.priceFloor
      : listing.instantSalePrice) || 0
  );
}

export function getFormatedListingPrice(listing: Listing) {
  return lamportToSolIsh(getListingPrice(listing));
}

export function lamportToSolIsh(lamports: number | null) {
  if (!lamports) return null;
  return Number((lamports * 0.000000001).toFixed(2));
}

export function ListingCard({
  listing,
  meta,
}: {
  listing: Listing;
  meta: {
    index: number;
    list: 'current-listings' | 'featured-listings' | 'storefront';
  };
}) {
  const storeHref = `https://${listing?.subdomain}.holaplex.com`;
  const listingHref = storeHref + `/listings/${listing.listingAddress}`;

  const [cardRef, inView] = useInView({
    threshold: 0,
  });

  const { track } = useAnalytics();

  const [showArtPreview, setShowArtPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [nft, setNFT] = useState<NFTMetadata | null>(null);

  const nftMetadata = listing?.items?.[0]; // other items are usually tiered auctions or participation nfts
  const isDev = false && process.env.NODE_ENV === 'development';
  const isSecondarySale = nftMetadata.primarySaleHappened;
  const isAuction = listing.endsAt;
  const hasParticipationNFTs = listing.items.length > 1;

  useEffect(() => {
    async function fetchNFTDataFromIPFS() {
      const res = await fetch(maybeCDN(nftMetadata.uri));

      if (res.ok) {
        const nftJson: NFTMetadata = await res.json();
        setNFT(nftJson);
        setTimeout(() => setLoading(false), 500);

        if (window.location.host.includes('localhost')) {
          console.log(nftMetadata.name, {
            ...listing,
            nftJson,
          });
        }
      }
    }
    if (!nftMetadata?.uri) {
      return;
    }

    fetchNFTDataFromIPFS();
  }, [nftMetadata?.uri]);

  // shows up to 2 decimals, but removes pointless 0s
  const displayPrice = getFormatedListingPrice(listing) || 0;

  // no subdomain means it's a shell/skeleton
  if (loading || !listing.subdomain) {
    return <SkeletonListing />;
  }

  const listingEndsAtDateTime = listing.endsAt
    ? DateTime.fromISO(listing.endsAt)
    : null;

  return (
    <div
      ref={cardRef}
      className="mb-12 rounded-t-lg pt-1 shadow-black transition sm:hover:scale-[1.02] sm:hover:shadow-xl"
      onClick={() => {
        track('Listing Selected', {
          event_category: 'Listings',
          event_label: nftMetadata.name,
          ...meta,
        });
      }}
    >
      <a
        href={listingHref}
        rel="nofollow noreferrer"
        target="_blank"
        className=""
      >
        <Square>
          <NFTPreview
            $show={inView}
            src={maybeImageCDN(nft?.image || '')}
            preview={{
              visible: showArtPreview,
              mask: (
                <CustomImageMask
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowArtPreview(true);
                    track('Listing Preview Expanded', {
                      event_category: 'Listings',
                      event_label: nftMetadata.name,
                      ...meta,
                    });
                  }}
                >
                  <CustomExpandIcon />
                </CustomImageMask>
              ),
              onVisibleChange: (visible, prevVisible) => {
                prevVisible && setShowArtPreview(visible);
              },
              destroyOnClose: true,
            }}
            alt={nftMetadata?.name + ' preview'}
          />
        </Square>
      </a>
      <div className="border-x border-gray-800 px-4 pt-4 pb-5">
        <a
          href={listingHref}
          rel="nofollow noreferrer"
          target="_blank"
          className=""
        >
          <div className="mb-1 flex items-center justify-between">
            <div className="max truncate text-lg font-semibold text-white">
              {nftMetadata?.name}
            </div>
            <div className="flex items-center">
              {hasParticipationNFTs && (
                <Tooltip
                  color="#171717"
                  title="Participation NFT"
                  overlayStyle={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  <ParticipationNFTIcon className="ml-2" />
                </Tooltip>
              )}
              {isSecondarySale && (
                <Tooltip
                  color="#171717"
                  title="Secondary listing"
                  overlayStyle={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  <SecondarySaleIcon className="ml-2" />
                </Tooltip>
              )}
            </div>
          </div>
        </a>
        <a href={storeHref} target="_blank" rel="noreferrer" className="z-10">
          <div className="flex items-center">
            {listing.logoUrl && (
              <img
                src={listing.logoUrl}
                className="mr-2 h-4 w-4 rounded-sm"
                alt={'logo for ' + listing.storeTitle}
              />
            )}

            <h4 className="m-0 truncate text-sm font-semibold text-gray-300 hover:text-white">
              {listing.storeTitle}
            </h4>
          </div>
        </a>
      </div>
      <a
        href={listingHref}
        rel="nofollow noreferrer"
        target="_blank"
        className=""
      >
        <div
          className={classNames(
            'flex items-center justify-between rounded-b-md px-4 py-4',
            isAuction ? 'bg-gray-800' : 'border border-gray-800 ',
          )}
        >
          <div>
            <div className="text-sm font-semibold text-gray-300">
              {isAuction
                ? listing.totalUncancelledBids
                  ? 'Current bid'
                  : 'Starting bid'
                : 'Price'}
            </div>
            <Price listing={listing} price={displayPrice} />
          </div>
          <div className="text-right">
            {listing.endsAt && listingEndsAtDateTime ? (
              <div className="-mb-[4px] flex flex-col justify-around">
                <div className="text-right text-sm font-semibold text-gray-300">
                  Ends in
                </div>
                <div className="-mt-[4px]">
                  {Date.now() < listingEndsAtDateTime.toMillis() ? (
                    <AuctionCountdown endTime={listing.endsAt} />
                  ) : (
                    listingEndsAtDateTime.toRelative()
                  )}
                </div>
              </div>
            ) : (
              <span className="rounded-full bg-white px-4 py-2 text-sm text-gray-900">
                Buy now
              </span>
            )}
          </div>
        </div>
      </a>

      {isDev && (
        <Row justify="space-between" wrap={false}>
          <span className="text-sm opacity-[0.6]">
            Listed {listing.createdAt.slice(5, 16)}
          </span>
          <span className="text-sm opacity-[0.6]">
            Bids: {listing.totalUncancelledBids}, (
            {listing.lastBidTime?.slice(5, 16)})
          </span>
        </Row>
      )}
    </div>
  );
}

const CustomExpandIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="4" fill="#f4f4f4" />
    <path
      d="M13.75 6.75H17.25V10.25"
      stroke="#161616"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10.25 17.25H6.75V13.75"
      stroke="#161616"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.25 6.75L13.1667 10.8333"
      stroke="#161616"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.75 17.25L10.8333 13.1667"
      stroke="#161616"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ParticipationNFTIcon = (props: any) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="24" height="24" rx="12" fill="url(#paint0_linear_1_3066)" />
    <path
      d="M10.105 12.945L9.5 17.5L12 16L14.5 17.5L13.895 12.94M15.5 10C15.5 11.933 13.933 13.5 12 13.5C10.067 13.5 8.5 11.933 8.5 10C8.5 8.067 10.067 6.5 12 6.5C13.933 6.5 15.5 8.067 15.5 10Z"
      stroke="white"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient
        id="paint0_linear_1_3066"
        x1="-0.000373752"
        y1="23.9999"
        x2="23.9997"
        y2="-0.000292212"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#171717" />
        <stop offset="1" stopColor="#525252" />
      </linearGradient>
    </defs>
  </svg>
);

const SecondarySaleIcon = (props: any) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <rect width="24" height="24" rx="12" fill="url(#paint0_linear_1_1485)" />
    <path
      d="M12.1312 16.7154C12.0248 16.8234 11.8358 16.8414 11.7117 16.7154C11.6053 16.6073 11.5876 16.4152 11.7117 16.2891L13.7145 14.2541L12.8815 13.4077L10.8787 15.4427C10.7664 15.5628 10.5773 15.5568 10.4592 15.4427C10.3351 15.3167 10.3528 15.1246 10.4592 15.0165L12.462 12.9815L11.629 12.1351L9.62616 14.1701C9.51981 14.2781 9.33076 14.2961 9.20669 14.1701C9.09444 14.056 9.09444 13.8639 9.20669 13.7439L11.2095 11.7089L10.3706 10.8624L8.36775 12.8974C8.26141 13.0055 8.07235 13.0235 7.94828 12.8974C7.83603 12.7774 7.83603 12.5913 7.94828 12.4712L10.536 9.84192L11.6408 10.9585C12.2021 11.5288 13.171 11.5228 13.7322 10.9585C14.3112 10.3702 14.3112 9.42171 13.7322 8.83342L12.6333 7.71686L12.7988 7.54877C13.2596 7.08054 14.0099 7.08054 14.4707 7.54877L16.9757 10.094C17.4366 10.5623 17.4366 11.3247 16.9757 11.7929L12.1312 16.7154ZM17.8088 12.6453C18.7304 11.7089 18.7304 10.1901 17.8088 9.24762L15.3038 6.70235C14.3821 5.76588 12.8874 5.76588 11.9598 6.70235L11.7944 6.87044L11.629 6.70235C10.7073 5.76588 9.2126 5.76588 8.28504 6.70235L6.1936 8.82741C5.35466 9.67984 5.27786 11.0065 5.95728 11.943L6.81394 11.0725C6.58353 10.6223 6.66033 10.052 7.03254 9.67384L9.12398 7.54877C9.5848 7.08054 10.3351 7.08054 10.7959 7.54877L12.8992 9.68584C13.0055 9.7939 13.0233 9.98599 12.8992 10.1121C12.7751 10.2381 12.5861 10.2201 12.4797 10.1121L10.536 8.14307L7.10934 11.6188C6.53036 12.2011 6.53036 13.1556 7.10934 13.7439C7.33976 13.978 7.63516 14.1221 7.94828 14.1641C7.98964 14.4762 8.12552 14.7764 8.36184 15.0165C8.59816 15.2566 8.89356 15.3947 9.20078 15.4367C9.24214 15.7489 9.37802 16.049 9.61434 16.2891C9.85066 16.5293 10.1461 16.6673 10.4533 16.7094C10.4946 17.0335 10.6364 17.3277 10.8668 17.5618C11.1445 17.8439 11.5167 18 11.9126 18C12.3084 18 12.6806 17.8439 12.9583 17.5618L17.8088 12.6453Z"
      fill="white"
    />
    <defs>
      <linearGradient
        id="paint0_linear_1_1485"
        x1="-0.000373752"
        y1="23.9999"
        x2="23.9997"
        y2="-0.000292212"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#171717" />
        <stop offset="1" stopColor="#525252" />
      </linearGradient>
    </defs>
  </svg>
);

export function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function generateListingShell(id: number): Listing {
  const now = new Date().toISOString();
  const nextWeek = new Date(now).toISOString();

  return {
    listingAddress: id + '',
    highestBid: 0,
    lastBidTime: null,
    priceFloor: 0,
    instantSalePrice: 0,
    totalUncancelledBids: 0,
    ended: false,
    primarySaleHappened: false,
    logoUrl: '',
    faviconUrl: '',
    items: [
      {
        metadataAddress: '',
        name: '',
        uri: '',
        primarySaleHappened: false,
      },
    ],
    createdAt: now,
    endsAt: nextWeek,
    subdomain: '',
    storeTitle: '',
  };
}

function calculateTimeLeft(endTime: string) {
  const now = DateTime.local();
  const end = DateTime.fromISO(endTime);

  return Duration.fromObject(end.diff(now).toObject());
}

function Countdown(props: { endTime: string }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(props.endTime));

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(props.endTime));
    }, 1000);
    // Clear timeout if the component is unmounted
    return () => clearTimeout(timer);
  });

  if (timeLeft.valueOf() < 0) return <span></span>;

  const format = timeLeft.toFormat("hh'h' mm'm' ss's'");

  return (
    <span className="text-right text-base font-semibold text-white">
      {format}
    </span>
  );
}

export default function AuctionCountdown(props: { endTime: string }) {
  const timeDiffMs = DateTime.fromISO(props.endTime).toMillis() - Date.now();
  const lessThanADay = timeDiffMs < 86400000; // one day in ms

  if (lessThanADay) {
    // only return the "expensive" Countdown component if required
    return <Countdown endTime={props.endTime} />;
  } else {
    const timeLeft = calculateTimeLeft(props.endTime).toFormat('dd:hh:mm:ss');

    const daysLeft2 = Number(timeLeft.slice(0, 2));

    return (
      <span className="text-right text-base font-semibold text-white">
        {daysLeft2} day{daysLeft2 > 1 && 's'}
      </span>
    );
  }
}

const Price = (props: { listing: Listing; price: number }) => {
  return (
    <div className="flex items-center">
      <svg
        className="mr-[5px] h-4 w-4 text-gray-300"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="8" cy="8" r="7.5" stroke="#707070" />
        <circle cx="8" cy="8" r="3.5" stroke="#707070" />
      </svg>

      <span
        className={`text-base font-semibold ${
          props.listing.totalUncancelledBids || !props.listing.endsAt
            ? 'text-white'
            : 'text-gray-300'
        }`}
      >
        {props.price}
      </span>
    </div>
  );
};

export interface Listing {
  createdAt: string; // ISO(ish) Date "2021-12-01 03:59:45"
  ended: boolean;
  endsAt: string | null; // ISO(ish) Date
  highestBid: number | null;
  instantSalePrice?: number | null; // is often 10000000000
  items: Item[]; // NFT metadata, including URI to fetch more data
  lastBidTime: string | null; // ISO(ish) Date
  listingAddress: string; // uuid of listing
  priceFloor: number | null;
  storeTitle: string;
  subdomain: string;
  logoUrl: string;
  faviconUrl: string;
  totalUncancelledBids?: number | null;
  primarySaleHappened: boolean;
  // would neeed to store listings in an object to make this performant in state management. Better to just reload it pr mount for now.
  // nftMetadata?: NFTMetadata[]; // same length as items. Is set on mount
}

export interface Item {
  metadataAddress: string;
  name: string;
  uri: string;
  primarySaleHappened: boolean;
}

export interface NFTMetadata {
  description: string;
  external_url: string;
  image: string; // url to image, often ipfs, sometimes arweave
  name: string;
  seller_fee_basis_points: number; // in thousands. Prbably need to divide by 100
  symbol: string;
  properties: {
    category: 'image' | string;
    creators: Creator[];
    files: {
      type: 'image/gif' | string;
      uri: string; // arweave URI
    }[];
  };
}

export interface Creator {
  address: string;
  verified?: boolean;
  share: number;
}
