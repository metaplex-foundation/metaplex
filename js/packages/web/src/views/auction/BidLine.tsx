import React, { useEffect, useState } from 'react';
import {
  BidderMetadata,
  formatUSD,
  fromLamports,
  getTwitterHandle,
  Identicon,
  ParsedAccount,
  shortenAddress,
  useConnection,
} from '@oyster/common';
import { MintInfo } from '@solana/spl-token';
import { useWallet } from '@solana/wallet-adapter-react';
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/solid';
import { DateTime } from 'luxon';
import { useSolPrice } from '../../contexts';

export default function BidLine(props: {
  bid: ParsedAccount<BidderMetadata>;
  mint?: MintInfo;
}) {
  const { bid, mint } = props;
  const { publicKey } = useWallet();
  const bidderPubkey = bid.info.bidderPubkey;
  const isMe = publicKey?.toBase58() === bidderPubkey;

  const amount = fromLamports(bid.info.lastBid, mint);

  const connection = useConnection();
  const [bidderTwitterHandle, setBidderTwitterHandle] = useState('');
  useEffect(() => {
    getTwitterHandle(connection, bidderPubkey).then(
      tw => tw && setBidderTwitterHandle(tw),
    );
  }, []);

  const solPrice = useSolPrice();

  const [priceUSD, setPriceUSD] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (solPrice !== undefined) setPriceUSD(solPrice * amount);
  }, [amount, solPrice]);

  return (
    <li>
      <div className="flex items-center px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 flex items-center">
          <div className="flex-shrink-0 pr-4">
            <Identicon size={48} address={bidderPubkey} />
          </div>
          <div className="min-w-0 flex-1 flex justify-between items-center text-color-text">
            <div>
              <a
                href={`https://www.holaplex.com/profiles/${bidderPubkey}`}
                className="text-base font-medium   truncate flex items-center "
                target="_blank"
                rel="noreferrer"
              >
                <p className="max-w-[125px] truncate text-color-text hover:text-primary">
                  {bidderTwitterHandle
                    ? `@${bidderTwitterHandle}`
                    : shortenAddress(bidderPubkey)}
                </p>
                {isMe && (
                  <span>
                    <CheckCircleIcon
                      className="flex-shrink-0 ml-1.5 h-5 w-5 text-primary"
                      aria-hidden="true"
                    />
                  </span>
                )}
              </a>
              <p className="mt-2 flex items-center text-sm opacity-75">
                <ClockIcon
                  className="flex-shrink-0 mr-1.5 h-4 w-4 "
                  aria-hidden="true"
                />
                <span>
                  {DateTime.fromMillis(
                    bid.info.lastBidTimestamp.toNumber() * 1000,
                  ).toRelative({
                    style: 'narrow',
                  })}
                </span>
              </p>
            </div>
            <div className=" ">
              <div>
                <p className="text-xl font-bold  flex justify-end items-center">
                  <svg
                    className="mr-[5px] h-4 w-4 stroke-color-text"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle cx="8" cy="8" r="7.5" />
                    <circle cx="8" cy="8" r="3.5" />
                  </svg>
                  {amount.toLocaleString()}
                </p>

                <p className="mt-2 flex items-center text-sm justify-end opacity-75">
                  {formatUSD.format(priceUSD || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
