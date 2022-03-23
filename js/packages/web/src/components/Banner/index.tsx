import React, { useState, useEffect } from 'react';
import { Typography, Button, Alert, Space } from 'antd';
import { TwitterOutlined } from '@ant-design/icons';
import { Connection, StorefrontSocialInfo } from '@oyster/common';
import { useWallet, useMeta } from '@oyster/common';
const { Text } = Typography;
import { Link, useParams } from 'react-router-dom';

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
        <div className="flex justify-center pt-4">
          <div className="pr-4">
            {twitterVerification ? (
              <a
                href={'https://twitter.com/' + twitterVerification}
                target="_blank"
                rel="noreferrer"
                className="twitter-button"
              >
                {' '}
                <Space>
                  <Button
                    type="text"
                    block
                    shape="round"
                    icon={
                      <TwitterOutlined style={{ fontSize: '18px', verticalAlign: 'text-top' }} />
                    }
                  >
                    @{twitterVerification}
                  </Button>
                  <div className=''>
                    <h3 className='text-primary'>|</h3>
                  </div>
                </Space>
              </a>
            ) : (
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
              )
            )}
          </div>
          
          <Disclosure.Button className="flex cursor-pointer pt-1">
            Created by
            <div className="flex -space-x-2 overflow-hidden pl-2">
              {creators.map((m) => {
                const current = m.info.address;
                return (
                  <a href={`https://www.holaplex.com/profiles/${current}`}>
                    <Identicon size={22} address={current} />
                  </a>
                );
              })}
            </div>
          </Disclosure.Button>
        </div>
      </div>
      {children}
      <Transition
      
      enter="transition duration-300 ease-out"
        enterFrom="transform scale-0 opacity-0"
        enterTo="transform scale-100 opacity-100"
        leave="transition duration-300 ease-out"
        leaveFrom="transform scale-100 opacity-100"
        leaveTo="transform scale-0 opacity-0"
      >
      <Disclosure.Panel className="px-8">
          <div className="pb-10">
            <div className="w-screen flex-row px-12">
              {creators.map((m) => {
                const current = m.info.address;
                const [creatorTwitterHandle, setCreatorTwitterHandle] = useState('');
                useEffect(() => {
                  getTwitterHandle(connection, current).then(
                    (tw) => tw && setCreatorTwitterHandle(tw)
                  );
                }, []);

                return (
                  <div className="mb-3 flex-row">
                    <a href={`https://www.holaplex.com/profiles/${current}`}>
                      <div  className=" relative flex rounded-md border p-3 pl-4 border-white/50">
                        <Identicon size={58} address={current} />

                        <div className=" pt-4 pl-4">
                          {creatorTwitterHandle
                            ? `@${creatorTwitterHandle}`
                            : shortenAddress(current)}
                        </div>

                        <div className="absolute inset-y-0 right-4 flex items-center !opacity-100">
                          View Profile
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
