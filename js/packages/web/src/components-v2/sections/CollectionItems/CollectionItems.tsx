import React, { FC, useState } from 'react'
import CN from 'classnames'
import { Chip } from '../../atoms/Chip'
import { TextField } from '../../atoms/TextField'
import { Dropdown, DropDownBody, DropDownToggle, DropDownMenuItem } from '../../atoms/Dropdown'
import { ArtCard } from '../../molecules/ArtCard'
import { Modal } from '../../molecules/Modal'
import { ArtDetails } from '../../molecules/ArtDetails'
import { QuickBuy } from '../../sections/QuickBuy'

import { arts } from '../../../../dummy-data/arts'
import { actions, NodeWallet, Wallet } from '@metaplex/js'
//import { Crypto } from '@metaplex/js/lib/utils/'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection, sendTransactions, sendTransactionWithRetry } from '@oyster/common'
import { WalletContextState } from '@solana/wallet-adapter-react'
import {
  AccountInfo,
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  Commitment,
  TransactionInstruction,
} from '@solana/web3.js'
import { ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID, u64 } from '@solana/spl-token'
//import CreateAssociatedTokenAccount from '@metaplex/js/lib/CreateAssociatedTokenAccount'

import { createAssociatedTokenAccountInstruction, toPublicKey } from '@oyster/common'
import { Account } from '@metaplex-foundation/mpl-core'
import { Link } from 'react-router-dom'
export interface CollectionItemsProps {
  [x: string]: any
}

export const CollectionItems: FC<CollectionItemsProps> = ({
  dataItems,
  className,
  ...restProps
}: CollectionItemsProps) => {
  const CollectionItemsClasses = CN(`collection-items w-full`, className)
  const [showQuickBuyModal, setShowQuickBuyModal] = useState<boolean>(false)
  const [showArtModalModal, setShowArtModalModal] = useState<boolean>(false)
  const [selectedArt, setSelectedArt] = useState<any>(null)

  return (
    <div className={CollectionItemsClasses} {...restProps}>
      <div className='flex flex-wrap gap-[8px] pt-[16px] pb-[16px] md:py-[32px]'>
        <Chip onClose={() => {}}>Buy Now</Chip>
        <Chip onClose={() => {}} label='Character'>
          Foxy belugie
        </Chip>
        <Chip onClose={() => {}} label='Price range'>
          ◎ .05 - ◎ .10
        </Chip>
        <Chip onClose={() => {}} label='Face'>
          Happy
        </Chip>
        <Chip onClose={() => {}} label='Shirt'>
          Beach
        </Chip>
        <Chip onClose={() => {}} label='Tier'>
          Professional
        </Chip>

        <button className='h-[32px] appearance-none rounded-full px-[8px] text-md font-500 text-B-400'>
          Clear all
        </button>
      </div>

      <div className='flex flex-col gap-[12px] md:flex-row md:gap-[20px]'>
        <TextField
          iconBefore={<i className='ri-search-2-line' />}
          placeholder='Search for traits, tags, item #s, and more...'
          size='sm'
        />

        <Dropdown className='w-full md:w-[260px]'>
          {({ isOpen, setIsOpen, setInnerValue, innerValue }: any) => {
            const onSelectOption = (value: string) => {
              setIsOpen(false)
              setInnerValue(value)
            }

            const options = [
              { label: 'Art: A to Z', value: 'Art: A to Z' },
              { label: 'Art: Z to A', value: 'Art: Z to A' },
              {
                label: 'Price: Low to High',
                value: 'Price: Low to High',
              },
              {
                label: 'Price: High to Low',
                value: 'Price: High to Low',
              },
            ]

            return (
              <>
                <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                  <TextField
                    iconAfter={
                      isOpen ? (
                        <i className='ri-arrow-up-s-line' />
                      ) : (
                        <i className='ri-arrow-down-s-line' />
                      )
                    }
                    value={innerValue || 'Price: Low to High'}
                    readOnly
                    size='sm'
                  />
                </DropDownToggle>

                {isOpen && (
                  <DropDownBody
                    align='right'
                    className='mt-[8px] w-full border border-B-10 shadow-lg shadow-B-700/10'>
                    {options?.map((option: any, index: number) => {
                      const { label, value } = option

                      return (
                        <DropDownMenuItem
                          key={index}
                          onClick={() => onSelectOption(value)}
                          {...option}>
                          {label}
                        </DropDownMenuItem>
                      )
                    })}
                  </DropDownBody>
                )}
              </>
            )
          }}
        </Dropdown>
      </div>

      <div className='grid grid-cols-2 gap-[16px] pt-[32px] md:grid-cols-3 md:gap-[28px] lg:grid-cols-4'>
        {dataItems.map((art: any, index: number) => {
          console.log(art[0])
          return (
            <Link to={`/auction/${art[0].auction.pubkey}`}>
              <ArtCard
                // onClickBuy={() => {
                //   setSelectedArt(art)
                //   setShowQuickBuyModal(true)
                // }}
                // onClickDetails={() => {
                //   setSelectedArt(art)
                //   setShowArtModalModal(true)
                // }}
                key={index}
                pubkey={art[0].thumbnail.metadata.pubkey}
                auction={art[0]}
              />
            </Link>
          )
        })}
      </div>

      {showQuickBuyModal && (
        <Modal heading='Complete order' onClose={() => setShowQuickBuyModal(false)}>
          {({ modalClose }: any) => {
            return (
              <>
                <QuickBuy
                  onSubmit={(e: any) => {
                    modalClose(e)
                    setShowQuickBuyModal(false)
                  }}
                  art={selectedArt}
                />
              </>
            )
          }}
        </Modal>
      )}

      {showArtModalModal && (
        <Modal onClose={() => setShowArtModalModal(false)} size='lg' isFixed={false}>
          {({ modalClose }: any) => {
            return (
              <>
                <ArtDetails
                  onSubmit={(e: any) => {
                    modalClose(e)
                    setShowArtModalModal(false)
                  }}
                  art={selectedArt}
                />
              </>
            )
          }}
        </Modal>
      )}
    </div>
  )
}

export default CollectionItems
