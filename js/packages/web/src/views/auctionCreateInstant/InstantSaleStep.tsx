import React, { useState, useMemo, useCallback } from 'react'
import { Input, Select } from 'antd'
import { Button, TextField } from '@oyster/common'
import { QUOTE_MINT } from '../../constants'
import { ArtSelector } from './artSelector'
import { useMint, Creator, WRAPPED_SOL_MINT } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import TokenDialog, { TokenButton } from '../../components/TokenDialog'
import { useTokenList } from '../../contexts/tokenList'
import { AuctionState, InstantSaleType } from './types'

const { Option } = Select

const InstantSaleStep = ({
  attributes,
  setAttributes,
  confirm,
}: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  // give default value to mint

  const { hasOtherTokens, tokenMap } = useTokenList()

  // give default value to mint
  const mintInfo = tokenMap.get(!mint ? QUOTE_MINT.toString() : mint.toString())

  attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = useMint(attributes.quoteMintAddress)!
    attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(attributes.quoteMintAddress)!
  }

  //console.log("OBJ MINT", mint.toBase58())
  const isMasterEdition = !!attributes?.items?.[0]?.masterEdition

  const copiesEnabled = useMemo(() => {
    const maxSupply = attributes?.items?.[0]?.masterEdition?.info?.maxSupply
    return !!maxSupply && maxSupply.toNumber() > 0
  }, [attributes?.items?.[0]])
  const artistFilter = useCallback(
    (i: SafetyDepositDraft) =>
      !(i.metadata.info.data.creators || []).some((c: Creator) => !c.verified),
    []
  )

  const isLimitedEdition = attributes.instantSaleType === InstantSaleType.Limited
  const shouldRenderSelect = attributes.items.length > 0

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Select which item to sell:</h2>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex w-full'>
          <ArtSelector
            filter={artistFilter}
            selected={attributes.items}
            setSelected={items => {
              setAttributes({ ...attributes, items })
            }}
            allowMultiple={false}>
            Select NFT
          </ArtSelector>
        </div>

        {shouldRenderSelect && (
          <div className='flex'>
            <label className='action-field'>
              <Select
                defaultValue={attributes.instantSaleType || InstantSaleType.Single}
                onChange={value =>
                  setAttributes({
                    ...attributes,
                    instantSaleType: value,
                  })
                }>
                <Option value={InstantSaleType.Single}>Sell unique token</Option>
                {copiesEnabled && (
                  <Option value={InstantSaleType.Limited}>Sell limited number of copies</Option>
                )}
                {!copiesEnabled && isMasterEdition && (
                  <Option value={InstantSaleType.Open}>Sell unlimited number of copies</Option>
                )}
              </Select>
              {isLimitedEdition && (
                <>
                  <span className='field-info'>
                    Each copy will be given unique edition number e.g. 1 of 30
                  </span>
                  <Input
                    autoFocus
                    className='input'
                    placeholder='Enter number of copies sold'
                    allowClear
                    onChange={info =>
                      setAttributes({
                        ...attributes,
                        editions: parseInt(info.target.value),
                      })
                    }
                  />
                </>
              )}
            </label>
          </div>
        )}

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>Auction mint</h6>
            </div>

            <div className='flex flex-col'>
              <TokenButton mint={mint} onClick={() => setShowTokenDialog(true)} />
              <TokenDialog
                setMint={setMint}
                open={showTokenDialog}
                onClose={() => {
                  setShowTokenDialog(false)
                }}
              />
            </div>
          </div>
        )}

        <div className='flex flex-col gap-[16px]'>
          <div className='flex flex-col gap-[8px]'>
            <h6 className='text-h6'>Price</h6>
            <p>This is the instant sale price for your item.</p>
          </div>

          <div className='flex'>
            <TextField
              type='number'
              min={0}
              autoFocus
              placeholder='Price'
              label='Enter price'
              onChange={info =>
                setAttributes({
                  ...attributes,
                  priceFloor: parseFloat(info.target.value),
                  instantSalePrice: parseFloat(info.target.value),
                })
              }
              iconBefore={'◎'}
              iconAfter={mintInfo?.symbol || 'CUSTOM'}
            />
          </div>
        </div>

        <div className='flex items-center'>
          <Button
            appearance='neutral'
            size='lg'
            isRounded={false}
            onClick={() => {
              confirm()
            }}>
            Continue
          </Button>
        </div>
      </div>
    </>
  )
}

export default InstantSaleStep
