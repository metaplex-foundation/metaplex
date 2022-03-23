import React, { useState, useEffect } from 'react';
import { Typography, Button, Alert, Space } from 'antd';
import { TwitterOutlined } from '@ant-design/icons';
import { StorefrontSocialInfo } from '@oyster/common';
import { useWallet, useMeta } from '@oyster/common';
const { Text } = Typography;
import { Link } from 'react-router-dom';

import { Identicon, shortenAddress, getTwitterHandle, useConnection } from '@oyster/common';
import { ChevronRightIcon } from '@heroicons/react/solid';
import { Disclosure, Transition } from '@headlessui/react';

export const Banner = ({
  src,
  headingText,
  subHeadingText,
  children,
  logo,
  twitterVerification,
  ownerAddress,
}: {
  src?: string;
  headingText: string;
  subHeadingText?: string;
  children?: React.ReactNode;
  logo: string;
  twitterVerification?: string;
  social?: StorefrontSocialInfo;
  ownerAddress?: string;
}) => {
  const wallet = useWallet();
  const { whitelistedCreatorsByCreator } = useMeta();
  const creators = Object.values(whitelistedCreatorsByCreator);

  const connection = useConnection();

  const CreatedByAvatars = ({ className }: { className?: string }) => (
    <Disclosure.Button className={'flex cursor-pointer items-center ' + className}>
      Created by
      <div className="flex -space-x-2 overflow-hidden pl-2">
        {creators.map((m) => {
          const creatorAddress = m.info.address;
          return (
            <a
              href={`https://www.holaplex.com/profiles/${creatorAddress}`}
              key={creatorAddress}
              target="_blank"
              rel="noreferrer"
            >
              <Identicon size={22} address={creatorAddress} />
            </a>
          );
        })}
      </div>
    </Disclosure.Button>
  );

  return (
    <Disclosure>
      <div id="metaplex-banner">
        {src ? (
          <img id="metaplex-banner-backdrop" src={src} />
        ) : (
          <div className="metaplex-margin-top-12"></div>
        )}
        <div className="logo-wrapper">
          <Link to="/" id="metaplex-header-logo">
            <img src={logo || ''} />
          </Link>
        </div>
        <div id="metaplex-banner-hero">
          <h1>{headingText}</h1>
          {subHeadingText && <Text>{subHeadingText}</Text>}
          {!twitterVerification &&
            wallet.connected &&
            ownerAddress === wallet.publicKey?.toBase58() && (
              <div className="metaplex-margin-top-8">
                <Alert
                  className="metaplex-flex-align-items-center metaplex-align-left"
                  message="Connect your Twitter account"
                  description={
                    <>
                      Help protect collectors by connecting your store to a Twitter page on{' '}
                      <a
                        href="https://naming.bonfida.org/#/twitter-registration"
                        rel="noreferrer"
                        target="_blank"
                      >
                        Bonfida
                      </a>
                    </>
                  }
                  icon={<TwitterOutlined />}
                  showIcon
                />
              </div>
            )}
          {!twitterVerification ? (
            <div className="flex justify-center mt-4">
              <CreatedByAvatars />
            </div>
          ) : (
            <div className="flex justify-between pt-4 flex-wrap ">
              <div className=" sm:w-2/5 justify-end flex">
                <a
                  href={'https://twitter.com/' + twitterVerification}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-gray-300"
                >
                  <Button
                    type="text"
                    block
                    className="!p-0 !flex !items-center "
                    shape="round"
                    icon={
                      <TwitterOutlined style={{ fontSize: '18px', verticalAlign: 'text-top' }} />
                    }
                  >
                    @{twitterVerification}
                  </Button>
                </a>
              </div>

              <div className="sm:flex items-center sm:w-1/5 justify-center hidden ">
                <h3 className="text-primary">|</h3>
              </div>

              <CreatedByAvatars className="sm:w-2/5 justify-start" />
            </div>
          )}
        </div>
        {children}
        <Transition
          enter="transition duration-300 ease-out"
          enterFrom="transform scale-0 opacity-0"
          enterTo="transform scale-100 opacity-100"
          leave="transition duration-300 ease-out"
          leaveFrom="transform scale-100 opacity-100"
          leaveTo="transform scale-0 opacity-0"
          className="w-full"
        >
          <Disclosure.Panel className=" ">
            <div className="pb-10">
              <div className="flex-col  ">
                {creators.map((m) => {
                  const creatorAddress = m.info.address;
                  const [creatorTwitterHandle, setCreatorTwitterHandle] = useState('');
                  useEffect(() => {
                    getTwitterHandle(connection, creatorAddress).then(
                      (tw) => tw && setCreatorTwitterHandle(tw)
                    );
                  }, []);

                  return (
                    <div className="mb-3 flex-row w-full" key={creatorAddress}>
                      <a
                        href={`https://www.holaplex.com/profiles/${creatorAddress}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className=" relative flex rounded-md border p-3 pl-4 border-white/50 w-full">
                          <Identicon size={58} address={creatorAddress} />

                          <div className=" pt-4 pl-4">
                            {creatorTwitterHandle
                              ? `@${creatorTwitterHandle}`
                              : shortenAddress(creatorAddress)}
                          </div>

                          <div className="hidden right-4 sm:flex items-center ml-auto ">
                            View profile
                            <ChevronRightIcon
                              className="h-5 w-5"
                              viewBox="0 0 18 18"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* </div> */}
          </Disclosure.Panel>
        </Transition>
      </div>
    </Disclosure>
  );
};
