import { WRAPPED_SOL_MINT, TextField, useMint } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { Select } from 'antd'
import { useState } from 'react'
import { QUOTE_MINT } from '../../constants'
import { useTokenList } from '../../contexts/tokenList'

const { Option } = Select

const PutOnAuction = ({ setAttributes, attributes }) => {
  const [showTokenDialog, setShowTokenDialog] = useState(false)
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const { hasOtherTokens } = useTokenList()

  attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = useMint(attributes.quoteMintAddress)!
    attributes.quoteMintInfoExtended = useTokenList().tokenMap.get(attributes.quoteMintAddress)!
  }

  return (
    <div className='flex space-x-4'>
      <div className='w-32 flex-auto'>
        <TextField
          type='number'
          min={0}
          autoFocus
          className='input'
          placeholder='Price'
          iconBefore='◎'
          iconAfter={
            attributes.quoteMintInfoExtended
              ? attributes.quoteMintInfoExtended.symbol
              : attributes.quoteMintAddress == WRAPPED_SOL_MINT.toBase58()
              ? 'SOL'
              : 'CUSTOM'
          }
          onChange={info =>
            setAttributes({
              ...attributes,
              priceFloor: parseFloat(info.target.value),
            })
          }
        />
      </div>
      <div className='w-64 flex-auto'>
        <div className='flex items-center gap-[8px]'>
          <TextField
            autoFocus
            type='number'
            className='input'
            placeholder='Set the auction duration'
            onChange={info =>
              setAttributes({
                ...attributes,
                auctionDuration: parseInt(info.target.value),
              })
            }
          />
          <Select
            defaultValue={attributes.auctionDurationType}
            onChange={value =>
              setAttributes({
                ...attributes,
                auctionDurationType: value,
              })
            }>
            <Option value='minutes'>Minutes</Option>
            <Option value='hours'>Hours</Option>
            <Option value='days'>Days</Option>
          </Select>
        </div>
      </div>
    </div>
  )
}

export default PutOnAuction
