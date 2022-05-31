import React, { FC } from 'react'
import CN from 'classnames'
import { ActivityCardCollection } from '@oyster/common'

export interface CollectionActivityListProps {
  [x: string]: any
}

// const dummyActivityList = [
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/yytjymgHK5Y64dJLHZlkCB-zbayUpAmLNB49VapL30g',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/ukZ3DgqeaTyx5qifyooXV-rO5CM8CjKnKFJZVlVQFaU',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/LlrUIT49BxcHsSGBXmQcJ70G_jjZMgcPZJh3CxqziuA',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/2HQvY0wYkzabT-3qzFZX-MpECFLFEXX1NhptwjZ98Jw',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/HYGi_EMu8Dhu9cWHaIBdJW0DPJkaZnDr0yJIMy5hlak',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
//   {
//     image:
//       'https://cdn-image.solanart.io/unsafe/600x600/filters:format(webp)/arweave.net/-00FUjXIBBOHmnp8v_li6uklY_vfrwR5FvVeVHjdpAM',
//     title: 'Degen Ape #1921',
//     description: 'Sale',
//     price: '49.92',
//     fromAddress: '6gr...Vun5',
//     toAddress: '7hk...JaoW',
//     time: '12 hours ago',
//   },
// ]

export const CollectionActivityList: FC<CollectionActivityListProps> = ({
  className,
  data,
  ...restProps
}: CollectionActivityListProps) => {
  const CollectionActivityListClasses = CN(
    `collection-activity-list w-full flex flex-col gap-[8px]`,
    className
  )

  return (
    <div className={CollectionActivityListClasses} {...restProps}>
      {data.nftActivities.map((activity: any, index: number) => (
        <ActivityCardCollection key={index} {...activity} />
      ))}
    </div>
  )
}

CollectionActivityList.defaultProps = {}

export default CollectionActivityList
