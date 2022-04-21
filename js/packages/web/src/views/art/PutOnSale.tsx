import { Button, TextField, useMint, WRAPPED_SOL_MINT } from '@oyster/common'
import { QUOTE_MINT } from '../../constants'
import { useTokenList } from '../../contexts/tokenList'

const PutOnSale = ({ setAttributes, attributes, submit, loading }) => {
  const { tokenMap } = useTokenList()
  const mintInfo = tokenMap.get(
    !WRAPPED_SOL_MINT ? QUOTE_MINT.toString() : WRAPPED_SOL_MINT.toString()
  )
  const quoteMintInfo = useMint(QUOTE_MINT.toBase58())!
  const quoteMintInfoExtended = useTokenList().tokenMap.get(attributes.quoteMintAddress)!

  attributes.quoteMintAddress = WRAPPED_SOL_MINT
    ? WRAPPED_SOL_MINT.toBase58()
    : QUOTE_MINT.toBase58()

  if (attributes.quoteMintAddress) {
    attributes.quoteMintInfo = quoteMintInfo
    attributes.quoteMintInfoExtended = quoteMintInfoExtended
  }

  return (
    <>
      <div className=''>
        <div className='w-64 flex-auto'>
          <TextField
            type='number'
            min={0}
            autoFocus
            placeholder='List Price'
            // label='Enter price'
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
        <div className='mt-5 flex w-32 flex-auto items-center justify-start'>
          <Button disabled={loading} onClick={submit} className='w-full'>
            List Now
          </Button>
        </div>
      </div>
    </>
  )
}

export default PutOnSale
