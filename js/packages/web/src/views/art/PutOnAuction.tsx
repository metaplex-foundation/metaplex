import { WRAPPED_SOL_MINT, TextField } from '@oyster/common'

const PutOnAuction = ({ setAttributes, attributes }) => {
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
