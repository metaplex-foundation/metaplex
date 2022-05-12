import React, { FC } from 'react'
import CN from 'classnames'
import {
  Dropdown,
  DropDownBody,
  DropDownToggle,
  DropDownMenuItem,
  Button,
  pubkeyToString,
  useConnectionConfig,
} from '@oyster/common'
import { AuctionView, useAuction, useExtendedArt } from '../../../hooks'
import { useAuctionsList } from '../../../views/home/components/SalesList/hooks/useAuctionsList'
import { LiveAuctionViewState } from '../../views'
import { useHistory } from 'react-router-dom'

export interface NFTDetailsTopBarProps {
  id: string
  className: string
  onSetAuction: (data: AuctionView) => void
}

export const NFTDetailsTopBar: FC<NFTDetailsTopBarProps> = ({ id, className, onSetAuction }) => {
  const NFTDetailsTopBarClasses = CN(`nft-details-top-bar w-full`, className)
  const { auctions } = useAuctionsList(LiveAuctionViewState.All)

  const auction = useAuction(id)
  const { data } = useExtendedArt(auction?.thumbnail.metadata.pubkey)
  const history = useHistory()
  const { endpoint } = useConnectionConfig()

  const allAuctions =
    typeof data?.collection === 'string'
      ? auctions.filter(
          auction =>
            auction.thumbnail.metadata.info.collection?.key === pubkeyToString(data?.collection)
        )
      : []

  // console.log('allAuctions', allAuctions)

  const getNextPubKey = () => {
    const currentPubKey = id
    const currentIndex = allAuctions
      .map(({ auction: { pubkey } }) => pubkey)
      .findIndex(element => element === currentPubKey)

    if (allAuctions.length > currentIndex + 1) {
      return allAuctions.map(({ auction: { pubkey } }) => pubkey)[currentIndex + 1]
    } else {
      return null
    }
  }

  const getPreviousPubKey = () => {
    const currentPubKey = id
    const currentIndex = allAuctions
      .map(({ auction: { pubkey } }) => pubkey)
      .findIndex(element => element === currentPubKey)

    if (currentIndex - 1 >= 0) {
      return allAuctions.map(({ auction: { pubkey } }) => pubkey)[currentIndex - 1]
    } else {
      return null
    }
  }
  const nextPubKey = getNextPubKey()
  const previousPubKey = getPreviousPubKey()

  console.log('nextPubKey', !!nextPubKey)

  const next = () => {
    if (nextPubKey) {
      const newAuction = allAuctions.find(i => {
        return i?.auction?.pubkey === nextPubKey
      })
      if (newAuction) {
        onSetAuction(newAuction)
      }
      history.push(`/nft-next/${nextPubKey}`)
    }
  }

  const previous = () => {
    if (previousPubKey) {
      const newAuction = allAuctions.find(i => {
        return i?.auction?.pubkey === previousPubKey
      })
      if (newAuction) {
        onSetAuction(newAuction)
      }
      history.push(`/nft-next/${previousPubKey}`)
    }
  }

  const mintAddress = auction?.thumbnail?.metadata?.info?.mint || null
  const collection = auction?.thumbnail?.metadata?.info?.collection?.key || null

  return (
    <div className={NFTDetailsTopBarClasses}>
      <div className='container flex justify-between'>
        <div className='flex'>
          <Button
            disabled={!collection}
            onClick={() => {
              if (collection) {
                history.push(`/collection/${collection}`)
              }
            }}
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconBefore={<i className='ri-arrow-left-s-line text-[20px] font-400' />}>
            Back to collection
          </Button>
        </div>

        <div className='flex gap-[8px]'>
          <Button
            disabled={!previousPubKey}
            onClick={previous}
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconBefore={<i className='ri-arrow-left-s-line text-[20px] font-400' />}>
            Previous NFT
          </Button>
          <Button
            disabled={!nextPubKey}
            onClick={next}
            appearance='ghost'
            view='outline'
            isRounded={false}
            iconAfter={<i className='ri-arrow-right-s-line text-[20px] font-400' />}>
            Next NFT
          </Button>
          {mintAddress && (
            <a
              href={`https://solscan.io/token/${mintAddress}?cluster=${endpoint.name}`}
              target='_blank'
              rel='noreferrer'>
              <Button
                appearance='ghost'
                view='outline'
                isRounded={false}
                iconAfter={<i className='ri-arrow-right-up-line text-[20px] font-400' />}>
                Explore on Solana
              </Button>
            </a>
          )}

          <Dropdown>
            {({ isOpen, setIsOpen, setInnerValue }: any) => {
              const onSelectOption = (value: string) => {
                setInnerValue(value)
                setIsOpen(false)
              }

              const options = [
                { label: 'Telegram', value: 'Telegram' },
                { label: 'Twitter', value: 'Twitter' },
                { label: 'Email', value: 'Email' },
                { label: 'Copy link', value: 'Copy link' },
              ]

              return (
                <>
                  <DropDownToggle onClick={() => setIsOpen(!isOpen)}>
                    <Button
                      appearance='ghost'
                      view='outline'
                      isRounded={false}
                      iconAfter={<i className='ri-share-forward-fill text-[20px] font-400' />}
                    />
                  </DropDownToggle>

                  {isOpen && (
                    <DropDownBody align='right' className='w-[200px]'>
                      {options.map((option: any, index: number) => {
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
      </div>
    </div>
  )
}
