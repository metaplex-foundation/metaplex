import React, { useState } from 'react'
import { Button, TextField } from '@oyster/common'
import { QUOTE_MINT } from '../../constants'
import { ArtSelector } from './artSelector'
import { useMint, Creator, WRAPPED_SOL_MINT } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { SafetyDepositDraft } from '../../actions/createAuctionManager'
import TokenDialog, { TokenButton } from '../../components/TokenDialog'
import { useTokenList } from '../../contexts/tokenList'
import { AuctionCategory, AuctionState } from './types'

const CopiesStep = (props: {
  attributes: AuctionState
  setAttributes: (attr: AuctionState) => void
  confirm: () => void
}) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const { hasOtherTokens } = useTokenList()

  props.attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (props.attributes.quoteMintAddress) {
    props.attributes.quoteMintInfo = useMint(props.attributes.quoteMintAddress)!
    props.attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(
      props.attributes.quoteMintAddress
    )!
  }

  const artistFilter = (i: SafetyDepositDraft) =>
    !(i.metadata.info.data.creators || []).find((c: Creator) => !c.verified)
  let filter: (i: SafetyDepositDraft) => boolean = () => true
  if (props.attributes.category === AuctionCategory.Limited) {
    filter = (i: SafetyDepositDraft) => !!i.masterEdition && !!i.masterEdition.info.maxSupply
  } else if (props.attributes.category === AuctionCategory.Open) {
    filter = (i: SafetyDepositDraft) =>
      !!(
        i.masterEdition &&
        (i.masterEdition.info.maxSupply === undefined || i.masterEdition.info.maxSupply === null)
      )
  }

  const overallFilter = (i: SafetyDepositDraft) => filter(i) && artistFilter(i)

  return (
    <>
      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex flex-col gap-[8px]'>
          <h2 className='text-h3'>Select which item to sell:</h2>
          <p>Select the item(s) that you want to list.</p>
        </div>
      </div>

      <div className='flex max-w-[700px] flex-col gap-[40px]'>
        <div className='flex'>
          <ArtSelector
            filter={overallFilter}
            selected={props.attributes.items}
            setSelected={items => {
              props.setAttributes({ ...props.attributes, items })
            }}
            allowMultiple={false}>
            Select NFT
          </ArtSelector>
        </div>

        {hasOtherTokens && (
          <div className='flex flex-col gap-[16px]'>
            <h6 className='text-h6'>Auction mint</h6>

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

        {props.attributes.category === AuctionCategory.Limited && (
          <div className='flex flex-col gap-[16px]'>
            <div className='flex flex-col gap-[8px]'>
              <h6 className='text-h6'>How many copies do you want to create?</h6>
              <p>Each copy will be given unique edition number e.g. 1 of 30.</p>
            </div>

            <div className='flex'>
              <TextField
                autoFocus
                type='number'
                placeholder='Enter number of copies sold'
                allowClear
                label='Number of copies'
                onChange={info =>
                  props.setAttributes({
                    ...props.attributes,
                    editions: parseInt(info.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        <div className='flex items-center'>
          <Button
            appearance='neutral'
            size='lg'
            isRounded={false}
            onClick={() => {
              props.confirm()
            }}>
            Continue to Terms
          </Button>
        </div>
      </div>
    </>
  )
}

export default CopiesStep
