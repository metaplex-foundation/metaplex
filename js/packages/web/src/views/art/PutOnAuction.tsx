import { WRAPPED_SOL_MINT, TextField, useMint } from '@oyster/common'
import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { QUOTE_MINT } from '../../constants'
import { useTokenList } from '../../contexts/tokenList'

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
    <>
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
    </>
  )
}

export default PutOnAuction
