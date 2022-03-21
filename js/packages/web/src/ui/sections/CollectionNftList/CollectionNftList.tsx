import React, { FC } from 'react'
import CN from 'classnames'
import { NFTCard } from '@oyster/common'

export interface CollectionNftListProps {
  [x: string]: any
}

export const CollectionNftList: FC<CollectionNftListProps> = ({
  className,
  ...restProps
}: CollectionNftListProps) => {
  const CollectionNftListClasses = CN(`collection-nft-list grid grid-cols-4 gap-[28px]`, className)

  return (
    <div className={CollectionNftListClasses} {...restProps}>
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/ukZ3DgqeaTyx5qifyooXV-rO5CM8CjKnKFJZVlVQFaU'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/LlrUIT49BxcHsSGBXmQcJ70G_jjZMgcPZJh3CxqziuA'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/HYGi_EMu8Dhu9cWHaIBdJW0DPJkaZnDr0yJIMy5hlak'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/Mleow4hOmjLDz7diwt2E-VDGg38VEW9ct3JNAQKiexg'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/r5GlraCv8mrssgQMRO8_7oXHiHOBHA7UPnCAINxeAFc'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/yytjymgHK5Y64dJLHZlkCB-zbayUpAmLNB49VapL30g'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
      <NFTCard
        image='https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/K3EhMzFeRDkprpTjpPyBgmHor-1Ow_jcU4uEqLVYZmk'
        title='Degen Ape #2314'
        price='2.36 SOL'
        dollarValue='$4.19'
        bidPrice='3.12 SOL'
      />
    </div>
  )
}

CollectionNftList.defaultProps = {}

export default CollectionNftList
