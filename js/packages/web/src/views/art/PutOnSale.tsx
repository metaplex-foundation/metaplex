import { Button, TextField, useMint, WRAPPED_SOL_MINT } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { QUOTE_MINT } from '../../constants'
import { useTokenList } from '../../contexts/tokenList'

const PutOnSale = ({ setAttributes, attributes, submit }) => {
  const { hasOtherTokens, tokenMap } = useTokenList()
  const [mint, setMint] = useState<PublicKey>(WRAPPED_SOL_MINT)
  const mintInfo = tokenMap.get(!mint ? QUOTE_MINT.toString() : mint.toString())

  const quoteMintInfo = useMint(QUOTE_MINT.toBase58())!
  const quoteMintInfoExtended = useTokenList().tokenMap.get(attributes.quoteMintAddress)!

  attributes.quoteMintAddress = mint ? mint.toBase58() : QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = quoteMintInfo
    attributes.quoteMintInfoExtended = quoteMintInfoExtended
  }

  return (
    <>
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
        <Button onClick={submit}>Submit</Button>
      </div>
    </>
  )
}

export default PutOnSale
