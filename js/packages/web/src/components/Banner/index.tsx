import React, { useState, useEffect, Fragment } from 'react';
import { Typography, Button, Alert } from 'antd';
import { TwitterOutlined } from '@ant-design/icons';
import { StorefrontSocialInfo } from '@oyster/common';
import { useWallet, useMeta } from '@oyster/common';
const { Text } = Typography;
import { Link } from 'react-router-dom';

import { Identicon, shortenAddress, getTwitterHandle, useConnection } from '@oyster/common';

import { Popover, Transition, Dialog } from '@headlessui/react';


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
  const [isOpen, setIsOpen] = useState(false)
  // const [isShowing, setIsShowing] = useState(false)
  function closeModal() {
    setIsOpen(false)
  }

  function openModal() {
    setIsOpen(true)
  }


  const CreatedByAvatars = ({ className }: { className?: string }) => (


    <div className={'flex cursor-pointer items-center ' + className}>
      
     <div onClick={openModal}> Created by </div>
     
      
      <div className="flex -space-x-2 overflow-hidden pl-2">
        {creators.map((m) => {
          const creatorAddress = m.info.address;
          const [creatorTwitterHandle, setCreatorTwitterHandle] = useState('');
                  useEffect(() => {
                    getTwitterHandle(connection, creatorAddress).then(
                      (tw) => tw && setCreatorTwitterHandle(tw)
                    );
                  }, []);

          return (
            
            // <a
            //   href={`https://www.holaplex.com/profiles/${creatorAddress}`}
            //   key={creatorAddress}
            //   target="_blank"
            //   rel="noreferrer"
            // > 
            <div key={creatorAddress}>
            <Popover >

                <Popover.Button as='div' 
               // onMouseEnter={() => setIsShowing(true)}
               // onMouseLeave={() => setIsShowing(false)}
                >
                <Identicon size={22} address={creatorAddress} />
                </Popover.Button>

                <Transition key={creatorAddress}
              // show={isShowing}
             //  onMouseEnter={() => setIsShowing(true)}
             //  onMouseLeave={() => setIsShowing(false)}
             enter="transition duration-300 ease-out"
             enterFrom="transform scale-0 opacity-0"
             enterTo="transform scale-100 opacity-100"
             leave="transition duration-300 ease-out"
             leaveFrom="transform scale-100 opacity-100"
             leaveTo="transform scale-0 opacity-0"
            >

            

                <Popover.Panel as='div'
                
                 className=" translate-x-3 absolute overflow-y-auto " >
                <div className="mb-3 flex-row w-full" key={creatorAddress}>
                      <a
                        href={`https://www.holaplex.com/profiles/${creatorAddress}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <div className=" relative flex-col rounded-md border p-3 pl-4 border-white/50 !bg-black w-full">
                          
                          <div className='flex space-x-20'>
                          <Identicon size={58} address={creatorAddress} />

                          <Button className="!rounded-full !text-color-text-accent !font-theme-title !bg-white mt-3 right-4 sm:flex items-center ml-auto ">
                            Follow
                          </Button>

                          </div>
                          <div className="mt-4">
                            {creatorTwitterHandle
                              ? `@${creatorTwitterHandle}`
                              : shortenAddress(creatorAddress)}
                          </div>

                        </div>
                      </a>
                    </div>
            
                </Popover.Panel>

                </Transition>
                </Popover>
             </div>
            
          );
          

        })}
      </div>
    </div>
  );

  return (
    
    <div>
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
        <div>
         <Transition
          appear show={isOpen} as={Fragment}
        > 
        <Dialog as="div"
          className="fixed inset-0 z-10 overflow-y-auto"
          open={isOpen} onClose={closeModal}>
          
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >


          <Dialog.Overlay className="fixed inset-0" />
          </Transition.Child>
          <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-black shadow-xl rounded-2xl">
            
            <Dialog.Title className="text-center pb-2 border-b-2">Creators</Dialog.Title>
              <Dialog.Description className="flex-col  ">
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
                        <div className=" relative flex rounded-md p-3 pl-4 border-white/50 w-full">
                          <Identicon size={58} address={creatorAddress} />

                          <div className=" pt-4 pl-4">
                            {creatorTwitterHandle
                              ? `@${creatorTwitterHandle}`
                              : shortenAddress(creatorAddress)}
                          </div>

                          <Button className="!rounded-full !text-color-text-accent !font-theme-title !bg-white mt-3 right-4 sm:flex items-center ml-auto ">
                            Follow
                          </Button>
                        </div>
                      </a>
                    </div>
                  );
                })}
              </Dialog.Description>
            </div>

            {/* </div> */}
          </Transition.Child>
          
          </div>
          </Dialog>
        </Transition>
        </div>
        </div>
    </div>
    
  );
};
